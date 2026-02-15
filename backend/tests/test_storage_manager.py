"""Tests for core/StorageManager.py — S3 file operations (mocked)."""

import os
from unittest.mock import patch

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest


class TestStorageManagerInit:
    def test_missing_bucket_raises_error(self, monkeypatch):
        monkeypatch.delenv("AWS_S3_BUCKET", raising=False)
        from core.StorageManager import StorageManager

        with pytest.raises(ValueError, match="AWS_S3_BUCKET"):
            StorageManager()

    @patch("core.StorageManager.boto3")
    def test_init_with_env_vars(self, mock_boto3, monkeypatch):
        monkeypatch.setenv("AWS_S3_BUCKET", "test-bucket")
        monkeypatch.setenv("AWS_REGION", "us-east-1")
        from core.StorageManager import StorageManager

        sm = StorageManager()
        assert sm.bucket_name == "test-bucket"
        assert sm.aws_region == "us-east-1"

    @patch("core.StorageManager.boto3")
    def test_init_with_explicit_params(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(
            bucket_name="my-bucket",
            aws_access_key_id="AKID",
            aws_secret_access_key="SECRET",
            aws_region="eu-west-1",
        )
        assert sm.bucket_name == "my-bucket"
        assert sm.aws_region == "eu-west-1"


class TestUploadPdf:
    @patch("core.StorageManager.boto3")
    def test_upload_pdf_success(self, mock_boto3, tmp_path):
        from core.StorageManager import StorageManager

        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4 fake content")

        sm = StorageManager(bucket_name="bucket", aws_region="eu-west-3")
        url = sm.upload_pdf(pdf_file, "resumes/test.pdf")

        assert "bucket" in url
        assert "resumes/test.pdf" in url
        sm.s3_client.upload_file.assert_called_once()

    @patch("core.StorageManager.boto3")
    def test_upload_nonexistent_file_raises(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(bucket_name="bucket")
        with pytest.raises(FileNotFoundError):
            sm.upload_pdf("/nonexistent/file.pdf", "key.pdf")

    @patch("core.StorageManager.boto3")
    def test_upload_non_pdf_raises(self, mock_boto3, tmp_path):
        from core.StorageManager import StorageManager

        txt_file = tmp_path / "test.txt"
        txt_file.write_text("not a pdf")

        sm = StorageManager(bucket_name="bucket")
        with pytest.raises(ValueError, match="PDF"):
            sm.upload_pdf(txt_file, "key.pdf")


class TestUploadPdfBytes:
    @patch("core.StorageManager.boto3")
    def test_upload_bytes_success(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(bucket_name="bucket", aws_region="eu-west-3")
        url = sm.upload_pdf_bytes(b"%PDF-1.4 content", "resumes/from-bytes.pdf")

        assert "bucket" in url
        assert "resumes/from-bytes.pdf" in url
        sm.s3_client.upload_fileobj.assert_called_once()


class TestDeleteFile:
    @patch("core.StorageManager.boto3")
    def test_delete_file_success(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(bucket_name="bucket")
        result = sm.delete_file("resumes/old.pdf")

        assert result is True
        sm.s3_client.delete_object.assert_called_once_with(Bucket="bucket", Key="resumes/old.pdf")


class TestPresignedUrl:
    @patch("core.StorageManager.boto3")
    def test_presigned_url_default_expiry(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(bucket_name="bucket")
        sm.s3_client.generate_presigned_url.return_value = "https://signed-url"

        url = sm.get_presigned_url("resumes/doc.pdf")
        assert url == "https://signed-url"
        sm.s3_client.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "bucket", "Key": "resumes/doc.pdf"},
            ExpiresIn=300,
        )

    @patch("core.StorageManager.boto3")
    def test_presigned_url_capped_expiry(self, mock_boto3):
        from core.StorageManager import StorageManager

        sm = StorageManager(bucket_name="bucket")
        sm.s3_client.generate_presigned_url.return_value = "https://signed-url"

        # Request 1 hour but should be capped to 300s
        sm.get_presigned_url("key.pdf", expiration=3600)
        call_args = sm.s3_client.generate_presigned_url.call_args
        assert call_args.kwargs.get("ExpiresIn", call_args[1].get("ExpiresIn")) == 300
