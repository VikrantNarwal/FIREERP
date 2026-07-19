import { verifyAccessToken } from './auth'

export function authMiddleware(handler, allowedRoles = []) {
  return async (request, context) => {
    try {
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - No token provided' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.substring(7)
      const decoded = verifyAccessToken(token)

      if (!decoded) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid token' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Check role permissions
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Insufficient permissions' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Attach user to request
      request.user = decoded

      return await handler(request, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return new Response(
        JSON.stringify({ error: 'Authentication error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}
