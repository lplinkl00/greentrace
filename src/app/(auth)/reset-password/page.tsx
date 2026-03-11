export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen items-center justify-center">
            <form className="p-8 border rounded space-y-4">
                <h1 className="text-2xl font-bold">Reset Password</h1>
                <input type="email" placeholder="Email" className="w-full border p-2 rounded" />
                <button type="submit" className="bg-blue-600 text-white p-2 rounded w-full">Send Reset Link</button>
            </form>
        </div>
    )
}
