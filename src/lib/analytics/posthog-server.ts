import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getPostHogServerClient() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  client ??= new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  });

  return client;
}

export async function captureServerEvent(input: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  const posthog = getPostHogServerClient();

  if (!posthog) {
    return;
  }

  posthog.capture({
    distinctId: input.distinctId,
    event: input.event,
    properties: input.properties,
  });

  await posthog.flush();
}
