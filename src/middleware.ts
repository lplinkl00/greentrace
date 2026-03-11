import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { UserRole } from '@prisma/client'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/reset-password')

    if (!user && !isAuthRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role-based redirect logic for root /
    if (user && request.nextUrl.pathname === '/') {
        // Fetch custom claim or app_metadata if available, but for simplicity of middleware 
        // we'll fetch from the DB via a fetch to a lightweight internal `/api/auth/session` route
        // or just rely on a default dashboard redirect and let the dashboard layout handle route group checking
        // Actually, Supabase injects raw_user_meta_data into the user object if we set it during User creation.
        // Let's check `user.user_metadata.role` if it exists.
        const role = user.user_metadata?.role as UserRole | undefined

        if (role === 'SUPER_ADMIN' || role === 'AGGREGATOR_MANAGER') {
            return NextResponse.redirect(new URL('/aggregator/dashboard', request.url))
        } else if (role === 'AUDITOR') {
            return NextResponse.redirect(new URL('/auditor/dashboard', request.url))
        } else {
            return NextResponse.redirect(new URL('/mill/dashboard', request.url))
        }
    }

    if (user && isAuthRoute) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)|api/).*)', // exclude API to prevent circular redirects
    ],
}
