/** Prompt until all permissions are granted, or the prompt returns cancel (1). */
export const runPermissionSetupLoop = async (
  areAllGranted: () => Promise<boolean>,
  promptOnce: () => Promise<number | void>,
) => {
  while (!(await areAllGranted())) {
    if ((await promptOnce()) === 1) break;
  }
};
