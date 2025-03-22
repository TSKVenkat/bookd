// app/admin/layout.tsx
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Event Platform Admin</h1>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <Link href="/admin/dashboard" className="hover:text-blue-300">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/organizers" className="hover:text-blue-300">
                  Organizers
                </Link>
              </li>
              <li>
                <Link href="/logout" className="hover:text-blue-300">
                  Logout
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      
      <main className="flex-grow bg-gray-100">
        <div className="container mx-auto">
          {children}
        </div>
      </main>
      
      <footer className="bg-gray-800 text-white p-4">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Event Platform Admin</p>
        </div>
      </footer>
    </div>
  );
}