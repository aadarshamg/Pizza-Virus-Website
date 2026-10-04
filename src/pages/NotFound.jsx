import { Button, EmptyState } from '../components/ui';

export default function NotFound() {
    return <EmptyState emoji="🍕" title="Page not found" subtitle="This slice seems to have gone missing." action={<Button to="/">Back to Home</Button>} />;
}
