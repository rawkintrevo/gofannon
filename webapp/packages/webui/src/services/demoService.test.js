import { describe, it, expect, vi, beforeEach } from 'vitest';
import demoService from './demoService';
import apiClient from './apiClient';

vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('demoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts generate code request', () => {
    const payload = { prompt: 'Build a demo' };

    demoService.generateDemoAppCode(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/demos/generate-code', payload);
  });

  it('fetches all demos', () => {
    demoService.getDemos();

    expect(apiClient.get).toHaveBeenCalledWith('/demos');
  });

  it('fetches a single demo', () => {
    demoService.getDemo('demo-123');

    expect(apiClient.get).toHaveBeenCalledWith('/demos/demo-123');
  });

  it('saves a demo', () => {
    const payload = { name: 'New demo' };

    demoService.saveDemo(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/demos', payload);
  });

  it('updates a demo', () => {
    const payload = { name: 'Updated demo' };

    demoService.updateDemo('demo-456', payload);

    expect(apiClient.put).toHaveBeenCalledWith('/demos/demo-456', payload);
  });

  it('deletes a demo', () => {
    demoService.deleteDemo('demo-789');

    expect(apiClient.delete).toHaveBeenCalledWith('/demos/demo-789');
  });
});
