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

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
        || request.nextUrl.pathname.startsWith('/reset-password')
        || request.nextUrl.pathname.startsWith('/signup')
        || request.nextUrl.pathname.startsWith('/auth/confirm')
        || request.nextUrl.pathname.startsWith('/set-password')
        || request.nextUrl.pathname.startsWith('/callback')

    if (!user && !isAuthRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Role-based redirect logic for root /
    if (user && request.nextUrl.pathname === '/') {
        const role = user.user_metadata?.role as UserRole | undefined
        const activeView = request.cookies.get('activeView')?.value

        if (role === 'SUPER_ADMIN' || role === 'AGGREGATOR_MANAGER') {
            if (role === 'SUPER_ADMIN' && activeView === 'company') {
                return NextResponse.redirect(new URL('/company/dashboard', request.url))
            }
            if (role === 'SUPER_ADMIN' && activeView === 'auditor') {
                return NextResponse.redirect(new URL('/auditor/dashboard', request.url))
            }
            return NextResponse.redirect(new URL('/aggregator/dashboard', request.url))
        } else if (role === 'AUDITOR') {
            return NextResponse.redirect(new URL('/auditor/dashboard', request.url))
        } else {
            return NextResponse.redirect(new URL('/company/dashboard', request.url))
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
