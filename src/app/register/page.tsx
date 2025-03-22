import RegisterForm from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Bookd</h2>
          <p className="mt-2 text-gray-600">Book your tickets with ease</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}