interface SummaryEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SummaryEditor({ value, onChange }: SummaryEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Profil / Objectif professionnel
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: Software engineer with 5+ years of experience in building scalable web applications. Passionate about clean code, user experience, and continuous learning."
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
      />
      <p className="mt-1 text-sm text-gray-500">
        Un court paragraphe qui resume votre profil et vos objectifs professionnels.
      </p>
    </div>
  );
}
