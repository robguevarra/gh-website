/**
 * Unlayer Email Templates
 * 
 * This file contains starter templates for Unlayer email editor.
 * These templates are designed to be used with the Unlayer email editor
 * and follow the Graceful Homeschooling branding guidelines.
 */

// Types for Unlayer templates
interface UnlayerDesign {
  counters?: {
    u_row?: number;
    u_column?: number;
    u_content_text?: number;
    u_content_image?: number;
    u_content_button?: number;
    u_content_divider?: number;
  };
  body: {
    rows: any[];
    values: {
      backgroundColor?: string;
      backgroundImage?: {
        url?: string;
        fullWidth?: boolean;
        repeat?: boolean;
        center?: boolean;
        cover?: boolean;
      };
      contentWidth?: string;
      fontFamily?: {
        label?: string;
        value?: string;
      };
    };
  };
  schemaVersion?: number;
}

// Base template with common styling and structure
const baseTemplate = {
  counters: {
    u_row: 5,
    u_column: 5,
    u_content_text: 5,
    u_content_image: 1,
    u_content_button: 2,
    u_content_divider: 2,
  },
  body: {
    rows: [],
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

// Email Verification Template
export const emailVerificationTemplate = {
  ...baseTemplate,
  body: {
    ...baseTemplate.body,
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
                  text: "<p style='text-align: center;'><span style='font-size: 24px;'><strong>Verify Your Email</strong></span></p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>Hello {{firstName}},</p><p>Thank you for signing up with Graceful Homeschooling! To complete your registration, please verify your email address by clicking the button below:</p>",
                },
              },
              {
                type: "button",
                values: {
                  containerPadding: "10px 20px 20px",
                  href: {
                    name: "web",
                    values: {
                      href: "{{verificationUrl}}",
                      target: "_blank",
                    },
                  },
                  buttonColors": {
                    color: "#FFFFFF",
                    backgroundColor: "#5C6AC4",
                    hoverColor: "#FFFFFF",
                    hoverBackgroundColor: "#4d59a6",
                  },
                  size: {
                    autoWidth: false,
                    width: "200px",
                  },
                  text: "<p>Verify Email</p>",
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
                  text: "<p>If the button above doesn't work, you can also verify your email by copying and pasting the following link into your browser:</p><p><a href='{{verificationUrl}}'>{{verificationUrl}}</a></p><p>This link will expire in 24 hours.</p><p>If you didn't sign up for an account, you can safely ignore this email.</p>",
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
  },
};

// Password Reset Template
export const passwordResetTemplate = {
  ...baseTemplate,
  body: {
    ...baseTemplate.body,
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
                  buttonColors": {
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
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "0px 0px 8px 8px",
        },
      },
    ],
  },
};

// Welcome Template
export const welcomeTemplate = {
  ...baseTemplate,
  body: {
    ...baseTemplate.body,
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
                  buttonColors": {
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
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "0px 0px 8px 8px",
        },
      },
    ],
  },
};

// Class Reminder Template
export const classReminderTemplate = {
  ...baseTemplate,
  body: {
    ...baseTemplate.body,
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
                  text: "<p style='text-align: center;'><span style='font-size: 24px;'><strong>Your Class is Coming Up!</strong></span></p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>Hello {{firstName}},</p><p>This is a reminder that your class <strong>{{className}}</strong> is scheduled for <strong>{{classDate}}</strong> at <strong>{{classTime}}</strong>.</p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p><strong>Class Details:</strong></p><ul><li><strong>Class:</strong> {{className}}</li><li><strong>Date:</strong> {{classDate}}</li><li><strong>Time:</strong> {{classTime}}</li><li><strong>Location:</strong> Online via Zoom</li></ul>",
                },
              },
              {
                type: "button",
                values: {
                  containerPadding: "10px 20px 20px",
                  href: {
                    name: "web",
                    values: {
                      href: "{{zoomLink}}",
                      target: "_blank",
                    },
                  },
                  buttonColors": {
                    color: "#FFFFFF",
                    backgroundColor: "#5C6AC4",
                    hoverColor: "#FFFFFF",
                    hoverBackgroundColor: "#4d59a6",
                  },
                  size: {
                    autoWidth: false,
                    width: "200px",
                  },
                  text: "<p>Join Class Now</p>",
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
                  text: "<p><strong>Preparation:</strong></p><p>{{preparationMaterials}}</p><p>We look forward to seeing you in class!</p>",
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
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "0px 0px 8px 8px",
        },
      },
    ],
  },
};

// Newsletter Template
export const newsletterTemplate = {
  ...baseTemplate,
  body: {
    ...baseTemplate.body,
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
                  text: "<p style='text-align: center;'><span style='font-size: 24px;'><strong>Monthly Newsletter</strong></span></p><p style='text-align: center;'><span style='font-size: 16px;'>{{date}}</span></p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 20px 20px",
                  text: "<p>Hello {{firstName}},</p><p>Welcome to our monthly newsletter! Here's what's happening at Graceful Homeschooling this month:</p>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 10px 20px",
                  text: "<h2 style='text-align: left;'><strong>New Courses</strong></h2><p>We're excited to announce several new courses that have been added to our platform this month:</p><ul><li><strong>Montessori at Home</strong> - Learn how to incorporate Montessori principles into your homeschool environment.</li><li><strong>Science Experiments for All Ages</strong> - Engage your children with hands-on science activities.</li><li><strong>Literature-Based History</strong> - Discover how to teach history through great books.</li></ul>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 10px 20px",
                  text: "<h2 style='text-align: left;'><strong>Community Highlights</strong></h2><p>Our homeschooling community continues to grow and thrive. Here are some highlights from our forum discussions:</p><ul><li>Practical tips for teaching multiple grade levels</li><li>Creative ways to incorporate art into your curriculum</li><li>Success stories from families transitioning to homeschooling</li></ul>",
                },
              },
              {
                type: "text",
                values: {
                  containerPadding: "0px 20px 10px 20px",
                  text: "<h2 style='text-align: left;'><strong>Upcoming Events</strong></h2><p>Mark your calendar for these upcoming events:</p><ul><li><strong>May 20, 2025</strong> - Homeschool Planning Workshop</li><li><strong>May 25, 2025</strong> - Q&A Session with Curriculum Experts</li><li><strong>June 5, 2025</strong> - Virtual Homeschool Conference</li></ul>",
                },
              },
              {
                type: "button",
                values: {
                  containerPadding: "10px 20px 20px",
                  href: {
                    name: "web",
                    values: {
                      href: "https://gracefulhomeschooling.com/events",
                      target: "_blank",
                    },
                  },
                  buttonColors": {
                    color: "#FFFFFF",
                    backgroundColor: "#5C6AC4",
                    hoverColor: "#FFFFFF",
                    hoverBackgroundColor: "#4d59a6",
                  },
                  size: {
                    autoWidth: false,
                    width: "220px",
                  },
                  text: "<p>View All Events</p>",
                  borderRadius: "4px",
                  textAlign: "center",
                  lineHeight: "120%",
                  padding: "12px 20px",
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
                  text: "<p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>© 2025 Graceful Homeschooling. All rights reserved.</span></p><p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>You're receiving this email because you subscribed to our newsletter. You can <a href='#'>unsubscribe</a> at any time.</p><p style='text-align: center;'><span style='color: #888888; font-size: 12px;'>If you have any questions, please contact us at <a href='mailto:support@gracefulhomeschooling.com'>support@gracefulhomeschooling.com</a></span></p>",
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
          padding: "0px",
          columnsBackgroundColor: "#ffffff",
          borderRadius: "0px 0px 8px 8px",
        },
      },
    ],
  },
};

// Export all templates
export const unlayerTemplates = {
  'email-verification': emailVerificationTemplate,
  'password-reset': passwordResetTemplate,
  'welcome': welcomeTemplate,
  'class-reminder': classReminderTemplate,
  'monthly-newsletter': newsletterTemplate,
};

// Export default templates by category
export const defaultTemplates = {
  authentication: {
    'email-verification': emailVerificationTemplate,
    'password-reset': passwordResetTemplate,
    'welcome': welcomeTemplate,
  },
  transactional: {
    'class-reminder': classReminderTemplate,
  },
  marketing: {
    'monthly-newsletter': newsletterTemplate,
  }
};
