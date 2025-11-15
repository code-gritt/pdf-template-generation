const { Cluster } = require('puppeteer-cluster');
const fs = require('fs');
const path = require('path');

// Helper: Remove invalid filename chars
function sanitizeFilename(name) {
    return name
        .replace(/[\/\\:*?"<>|]/g, '_') // Replace invalid chars with _
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();
}

(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_PAGE,
        maxConcurrency: 2,
        puppeteerOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
    });

    await cluster.task(async ({ page, data }) => {
        const htmlPath = path.join(__dirname, 'templates', 'wayleave.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });

        // SANITIZE FILENAME
        const safeAppNo = sanitizeFilename(data.application_no || 'SAMPLE');
        const outputPath = path.join(__dirname, 'output', `WL-${safeAppNo}.pdf`);

        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`PDF generated: ${outputPath}`);
    });

    // TEST DATA
    const sampleData = {
        application_no: 'SAN / 809 / 2017',
    };

    cluster.queue(sampleData);

    await cluster.idle();
    await cluster.close();

    console.log('PDF generation complete!');
})();
