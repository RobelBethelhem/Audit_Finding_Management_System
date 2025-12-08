const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.zemenbank.com',
    port: 25,
    secure: false,
    auth: {
        user: "zapp",
        pass: "Lr$msH@hr25hr"
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log('ZAPP credentials failed:', error);
    } else {
        console.log('ZAPP credentials still work!');
    }
});