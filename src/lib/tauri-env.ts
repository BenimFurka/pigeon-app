let isTauriEnvironment: boolean | null = null;

export const getIsTauriEnvironment = async (): Promise<boolean> => {
    if (isTauriEnvironment !== null) {
        return isTauriEnvironment;
    }

    if (typeof window === 'undefined') {
        isTauriEnvironment = false;
        return false;
    }

    try {
        isTauriEnvironment = "__TAURI_INTERNALS__" in window;
        return isTauriEnvironment;
    } catch {
        isTauriEnvironment = false;
        return false;
    }
};
