import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-0 border border-primary-100/50 hover:border-primary-200/50 hover:shadow-soft transition-all">
      <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4 text-brand">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-primary-900 mb-1.5">{title}</h3>
      <p className="text-sm text-primary-500 leading-relaxed">{description}</p>
    </div>
  );
}
