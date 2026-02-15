"""S3 Storage Manager for uploading PDF files."""

import os
from pathlib import Path

import boto3


class StorageManager:
    """Manages file uploads to AWS S3."""

    def __init__(
        self,
        bucket_name: str | None = None,
        aws_access_key_id: str | None = None,
        aws_secret_access_key: str | None = None,
        aws_region: str | None = None,
    ):
        """Initialize the S3 storage manager.

        Args:
            bucket_name: S3 bucket name. Defaults to AWS_S3_BUCKET env var.
            aws_access_key_id: AWS access key. Defaults to AWS_ACCESS_KEY_ID env var.
            aws_secret_access_key: AWS secret key. Defaults to AWS_SECRET_ACCESS_KEY env var.
            aws_region: AWS region. Defaults to AWS_REGION env var or 'eu-west-3'.
        """
        self.bucket_name = bucket_name or os.environ.get("AWS_S3_BUCKET")
        self.aws_region = aws_region or os.environ.get("AWS_REGION", "eu-west-3")

        if not self.bucket_name:
            raise ValueError("AWS_S3_BUCKET environment variable is not set")

        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key_id or os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=aws_secret_access_key or os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=self.aws_region,
        )

    def upload_pdf(self, file_path: str | Path, s3_key: str) -> str:
        """Upload a PDF file to S3.

        Args:
            file_path: Local path to the PDF file.
            s3_key: The key (path) to use in S3 bucket.

        Returns:
            The S3 URL of the uploaded file.

        Raises:
            FileNotFoundError: If the local file doesn't exist.
            ClientError: If the upload fails.
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not file_path.suffix.lower() == ".pdf":
            raise ValueError(f"File must be a PDF: {file_path}")

        self.s3_client.upload_file(
            str(file_path),
            self.bucket_name,
            s3_key,
            ExtraArgs={"ContentType": "application/pdf"},
        )

        return f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"

    def upload_pdf_bytes(self, pdf_content: bytes, s3_key: str) -> str:
        """Upload PDF content directly from bytes.

        Args:
            pdf_content: PDF file content as bytes.
            s3_key: The key (path) to use in S3 bucket.

        Returns:
            The S3 URL of the uploaded file.

        Raises:
            ClientError: If the upload fails.
        """
        from io import BytesIO

        self.s3_client.upload_fileobj(
            BytesIO(pdf_content),
            self.bucket_name,
            s3_key,
            ExtraArgs={"ContentType": "application/pdf"},
        )

        return f"https://{self.bucket_name}.s3.{self.aws_region}.amazonaws.com/{s3_key}"

    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3.

        Args:
            s3_key: The key (path) of the file in S3.

        Returns:
            True if deletion was successful.

        Raises:
            ClientError: If the deletion fails.
        """
        self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        return True

    # SECURITY: Maximum URL expiration time (5 minutes) to limit exposure window
    MAX_URL_EXPIRATION = 300

    def get_presigned_url(self, s3_key: str, expiration: int = 300) -> str:
        """Generate a presigned URL for downloading a file.

        Args:
            s3_key: The key (path) of the file in S3.
            expiration: URL expiration time in seconds (default: 5 minutes, max: 5 minutes).

        Returns:
            A presigned URL for downloading the file.
        """
        # SECURITY: Enforce maximum expiration time
        safe_expiration = min(expiration, self.MAX_URL_EXPIRATION)

        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": s3_key},
            ExpiresIn=safe_expiration,
        )
