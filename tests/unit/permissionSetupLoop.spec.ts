import { describe, expect, it } from 'vitest';
import { runPermissionSetupLoop } from '@/services/permissionSetupLoop';

describe('runPermissionSetupLoop', () => {
  it('re-checks granted each iteration (no stale flag)', async () => {
    let granted = false;
    let prompts = 0;
    await runPermissionSetupLoop(
      async () => granted,
      async () => {
        prompts++;
        granted = true;
      },
    );
    expect(prompts).toBe(1);
  });

  it('stops when prompt returns cancel', async () => {
    let prompts = 0;
    await runPermissionSetupLoop(
      async () => false,
      async () => {
        prompts++;
        return 1;
      },
    );
    expect(prompts).toBe(1);
  });
});
