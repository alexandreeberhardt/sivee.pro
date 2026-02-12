import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureCard from './FeatureCard';

describe('FeatureCard', () => {
  it('renders title, description, and icon', () => {
    render(
      <FeatureCard
        icon={<span data-testid="icon">IC</span>}
        title="My Title"
        description="My Description"
      />
    );

    expect(screen.getByText('My Title')).toBeInTheDocument();
    expect(screen.getByText('My Description')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with different props', () => {
    render(
      <FeatureCard
        icon={<svg data-testid="svg-icon" />}
        title="Another Feature"
        description="Another description text"
      />
    );

    expect(screen.getByText('Another Feature')).toBeInTheDocument();
    expect(screen.getByText('Another description text')).toBeInTheDocument();
    expect(screen.getByTestId('svg-icon')).toBeInTheDocument();
  });
});
