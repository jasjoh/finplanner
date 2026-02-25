import { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD, } from "../config/constants.js";
function parseBasicAuth(header) {
    if (!header || !header.startsWith("Basic "))
        return null;
    const encoded = header.slice(6).trim();
    if (!encoded)
        return null;
    try {
        const decoded = Buffer.from(encoded, "base64").toString("utf8");
        const colonIndex = decoded.indexOf(":");
        if (colonIndex === -1)
            return null;
        return {
            username: decoded.slice(0, colonIndex),
            password: decoded.slice(colonIndex + 1),
        };
    }
    catch {
        return null;
    }
}
export function basicAuthMiddleware(_req, res, next) {
    const credentials = parseBasicAuth(_req.headers.authorization);
    if (!credentials ||
        credentials.username !== BASIC_AUTH_USERNAME ||
        credentials.password !== BASIC_AUTH_PASSWORD) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map