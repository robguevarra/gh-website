/**
 * Password Reset Template for Unlayer
 * 
 * This template is designed for Unlayer email editor
 * and follows Graceful Homeschooling branding guidelines.
 * 
 * Variables used:
 * - {{firstName}}: User's first name
 * - {{resetUrl}}: URL for password reset
 * - {{expiresInMinutes}}: Expiration time in minutes
 */

// Define the Unlayer template for password reset
const passwordResetTemplate = {
  counters: {
    u_row: 3,
    u_column: 3,
    u_content_text: 3,
    u_content_image: 1,
    u_content_button: 1,
    u_content_divider: 1,
  },
  body: {
    rows: [
      // Header with logo
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "image",
                values: {
                  src: {
                    url: "/logo-gh.png",
                    width: 180,
                  },
                  containerPadding: "20px",
                  linkHref: {
                    url: "https://gracefulhomeschooling.com",
                  },
                },
              },
            ],
            values: {
              backgroundColor: "#ffffff",
              borderRadius: "8px 8px 0px 0px",
            },
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          backgroundImage: {
            url: "",
            fullWidth: true,
            repeat: false,
            center: true,
            cover: false,
          },
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "8px 8px 0px 0px",
        },
      },
      
      // Main Content
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "text",
                values: {
                  containerPadding: "20px",
                  text: "<p style='text-align: center;'><span style='font-size: 24px;'><strong>Reset Your Password</strong></span></p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>Hello {{firstName}},</p><p>We received a request to reset your password. To create a new password, click the button below:</p>",
                },
              },
              {
                type: "button",
                values: {
                  containerPadding: "10px 20px 20px",
                  href: {
                    name: "web",
                    values: {
                      href: "{{resetUrl}}",
                      target: "_blank",
                    },
                  },
                  buttonColors: {
                    color: "#FFFFFF",
                    backgroundColor: "#5C6AC4",
                    hoverColor: "#FFFFFF",
                    hoverBackgroundColor: "#4d59a6",
                  },
                  size: {
                    autoWidth: false,
                    width: "220px",
                  },
                  text: "<p>Reset Password</p>",
                  borderRadius: "4px",
                  textAlign: "center",
                  lineHeight: "120%",
                  padding: "12px 20px",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>If the button above doesn't work, you can also reset your password by copying and pasting the following link into your browser:</p><p><a href='{{resetUrl}}'>{{resetUrl}}</a></p><p>This link will expire in {{expiresInMinutes}} minutes.</p><p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>",
                },
              },
            ],
            values: {
              backgroundColor: "#ffffff",
            },
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          backgroundImage: {
            url: "",
            fullWidth: true,
            repeat: false,
            center: true,
            cover: false,
          },
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
        },
      },
      
      // Footer
      {
        cells: [1],
        columns: [
          {
            contents: [
              {
                type: "divider",
                values: {
                  containerPadding: "20px 20px 0px",
                  width: "100%",
                  border: {
                    borderTopWidth: "1px",
                    borderTopStyle: "solid",
                    borderTopColor: "#E0E0E0",
                  },
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "20px",
                  text: "<p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>© 2025 Graceful Homeschooling. All rights reserved.</span></p><p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>If you have any questions, please contact us at <a href='mailto:support@gracefulhomeschooling.com'>support@gracefulhomeschooling.com</a></span></p>",
                },
              },
            ],
            values: {
              backgroundColor: "#ffffff",
              borderRadius: "0px 0px 8px 8px",
            },
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          backgroundImage: {
            url: "",
            fullWidth: true,
            repeat: false,
            center: true,
            cover: false,
          },
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "0px 0px 8px 8px",
        },
      },
    ],
    values: {
      backgroundColor: "#f7f7f7",
      backgroundImage: {
        url: "",
        fullWidth: true,
        repeat: false,
        center: true,
        cover: false,
      },
      contentWidth: "600px",
      fontFamily: {
        label: "Open Sans",
        value: "'Open Sans', sans-serif",
      },
    },
  },
  schemaVersion: 9,
};

export default passwordResetTemplate;
