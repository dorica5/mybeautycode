import PostHog from 'posthog-react-native';

export const posthog = new PostHog(
    "",
    {
        host: "https://app.posthog.com"
    }
)

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
    posthog.identify(userId, traits);
}