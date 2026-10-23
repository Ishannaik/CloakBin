// Test stand-in for $env/dynamic/private: reads process.env live, like the real module at runtime.
export const env = process.env as Record<string, string | undefined>;
