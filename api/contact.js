import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { name, contact, message } = req.body || {};

    if (
      !name || !contact || !message ||
      name.length < 2 ||
      contact.length < 3 ||
      message.length < 10
    ) {
      return res.status(400).send("Nieprawidłowe dane formularza");
    }

    if (message.length > 3000) {
      return res.status(400).send("Treść zbyt długa");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.poczta.fm",
      port: 587,
      secure: false,
      auth: {
        user: process.env.CONTACT_EMAIL_USER,
        pass: process.env.CONTACT_EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"JL Pro Bike Serwis" <${process.env.CONTACT_EMAIL_USER}>`,
      to: "probikeserwis@poczta.fm",
      replyTo: contact,
      subject: "Nowe zapytanie ze strony – JL Pro Bike Serwis",
      text: `
Imię i nazwisko:
${name}

Kontakt:
${contact}

Treść wiadomości:
${message}
      `,
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("CONTACT ERROR:", err);
    return res.status(500).send("Błąd serwera");
  }
}
