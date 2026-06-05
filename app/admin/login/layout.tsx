export default function AdminLoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // This layout bypasses the admin protected route
    return <>{children}</>;
}
