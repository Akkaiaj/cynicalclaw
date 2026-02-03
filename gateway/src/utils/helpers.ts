export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
export const truncate = (str: string, max: number) => str.length > max ? str.slice(0, max) + '...' : str;
export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const getSarcasticLoadingMessage = (): string => {
  const msgs = [
    "Consulting the digital void...",
    "Asking server hamsters to run faster...",
    "Contemplating existence and your request...",
    "Downloading more RAM...",
    "Teaching AI to feel emotions...",
    "Bribing quantum particles...",
    "Calculating universe's indifference...",
    "Waiting for electrons to mood..."
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

export const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};
