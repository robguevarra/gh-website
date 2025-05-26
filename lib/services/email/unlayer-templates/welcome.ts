/**
 * Welcome Template for Unlayer
 * 
 * This template is designed for Unlayer email editor
 * and follows Graceful Homeschooling branding guidelines.
 * 
 * Variables used:
 * - {{firstName}}: User's first name
 * - {{loginUrl}}: URL for login page
 */

// Define the Unlayer template for welcome email
const welcomeTemplate = {
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
                  text: "<p style='text-align: center;'><span style='font-size: 24px;'><strong>Welcome to Graceful Homeschooling!</strong></span></p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>Hello {{firstName}},</p><p>Thank you for joining Graceful Homeschooling! We're excited to have you as part of our community.</p><p>Your account has been successfully created, and you can now access all our resources, courses, and community forums.</p>",
                },
              },
              {
                type: "button",
                values: {
                  containerPadding: "10px 20px 20px",
                  href: {
                    name: "web",
                    values: {
                      href: "{{loginUrl}}",
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
                    width: "180px",
                  },
                  text: "<p>Login Now</p>",
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
                  text: "<p>Here are a few things you can do to get started:</p><ol><li>Complete your profile</li><li>Browse our course catalog</li><li>Join the community forum</li><li>Download our homeschool planning resources</li></ol><p>If you have any questions, please don't hesitate to reach out to our support team.</p>",
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
                  text: "<p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>© 2025 Graceful Homeschooling. All rights reserved.</span></p><p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>If you have any questions, please contact us at <a href='mailto:help@gracefulhomeschooling.com'>help@gracefulhomeschooling.com</a></span></p>",
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

export default welcomeTemplate;
