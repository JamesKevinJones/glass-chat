import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../../store/useChatStore';
import { ConnectionErrorScreen } from './ConnectionErrorScreen';

describe('ConnectionErrorScreen', () => {
  beforeEach(() => {
    useChatStore.setState({
      error: 'Ollama is not reachable on localhost:11434',
      refreshModels: vi.fn(),
    });
  });

  it('renders a friendly offline prompt', async () => {
    const refreshModels = vi.fn();
    useChatStore.setState({ refreshModels });

    render(<ConnectionErrorScreen />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/ollama serve/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry connection/i }));
    expect(refreshModels).toHaveBeenCalled();
  });
});
