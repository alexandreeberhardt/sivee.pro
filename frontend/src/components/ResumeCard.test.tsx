import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResumeCard from './ResumeCard';
import { SavedResume } from '../types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockResume: SavedResume = {
  id: 1,
  user_id: 1,
  name: 'Mon CV Test',
  json_content: {
    personal: { name: 'John', title: 'Dev', location: '', email: '', phone: '', links: [] },
    sections: [],
    template_id: 'harvard',
  },
  s3_url: null,
  created_at: '2024-01-15T10:00:00Z',
};

const renderCard = async (props: Partial<Parameters<typeof ResumeCard>[0]> = {}) => {
  const defaultProps = {
    resume: mockResume,
    isActive: false,
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
  };
  const merged = { ...defaultProps, ...props };

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ResumeCard {...merged} />);
  });

  return { ...result!, ...merged };
};

describe('ResumeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to resolve immediately - prevents act() warnings from async generatePreview
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false } as Response)
    );
  });

  it('renders resume name', async () => {
    await renderCard();
    expect(screen.getByText('Mon CV Test')).toBeInTheDocument();
  });

  it('renders template name and date', async () => {
    await renderCard();
    expect(screen.getByText('harvard')).toBeInTheDocument();
    const dateEl = screen.getByText(new Date('2024-01-15T10:00:00Z').toLocaleDateString());
    expect(dateEl).toBeInTheDocument();
  });

  it('shows active indicator when isActive', async () => {
    await renderCard({ isActive: true });
    expect(screen.getByText('resumes.current')).toBeInTheDocument();
  });

  it('calls onOpen when card is clicked', async () => {
    const { onOpen } = await renderCard();
    fireEvent.click(screen.getByText('Mon CV Test'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('strips size suffix from template_id for display', async () => {
    const compactResume: SavedResume = {
      ...mockResume,
      json_content: {
        ...mockResume.json_content!,
        template_id: 'harvard_compact',
      },
    };

    await renderCard({ resume: compactResume });
    expect(screen.getByText('harvard')).toBeInTheDocument();
  });
});
