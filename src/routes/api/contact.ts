import { createFileRoute } from "@tanstack/react-router";

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ContactRequest;

          // Validate input
          if (!body.name || !body.email || !body.subject || !body.message) {
            return new Response(
              JSON.stringify({ error: "Missing required fields" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const messageId = crypto.randomUUID();
          
          // Log the message for now (in production, send email via Lovable)
          console.log("Contact form submission:", {
            messageId,
            name: body.name,
            email: body.email,
            subject: body.subject,
            message: body.message,
            timestamp: new Date().toISOString(),
          });

          return new Response(JSON.stringify({ success: true, messageId }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Contact API error:", error);
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
