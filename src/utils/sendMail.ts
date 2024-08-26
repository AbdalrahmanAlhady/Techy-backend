import nodemailer from "nodemailer";

export async function sendEmail(
  dest: string,
  message: string,
  subject: string
) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
      user: "todays.cm.2020@gmail.com",
      pass: "pyeveqvmbmwyxsup",
    },
  });

  let info = await transporter.sendMail({
    from: `Techy <todays.cm.2020@gmail.com>`,
    to: dest,
    subject: "Your verification code",
    text: message,
    html: `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Techy</title>
        <style>
          .container {
            width: 100%;
            height: 100%;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .email {
            width: 80%;
            margin: 0 auto;
            background-color: #fff;
            padding: 20px;
          }
          .email-header {
            background-color: #333;
            color: #fff;
            padding: 20px;
            text-align: center;
          }
          .email-body {
            padding: 20px;
          }
          .email-footer {
            background-color: #333;
            color: #fff;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email">
            <div class="email-header">
              <h1>${subject}</h1>
            </div>
            <div class="email-body">
              <p>${message}</p>
            </div>
            <div class="email-footer">
              <p>Techy platform</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `,
  });
}
