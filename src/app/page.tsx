import Link from 'next/link';

export default function Home() {
  return (
    <div className="bg-white min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Bookd</h1>
          <div>
            <Link href="/login" className="text-blue-600 hover:text-blue-800 mr-4">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Book Your Tickets with Ease
            </h2>
            <p className="mt-4 text-xl text-gray-500">
              Find and book tickets for your favorite events in just a few clicks.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/register"
                className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}