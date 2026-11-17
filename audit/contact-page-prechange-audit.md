# Contact Page Pre-change Audit

## Repository State

- Project: `E:\begapunk-site-v2`
- Branch: `release-phase-2b-predeploy-repair`
- Starting commit: `20fab1fc89cb115084e721f6c773ef2540c4d2d2`
- Existing tracked modifications: none
- Existing untracked content: `catalog-project/` working files (outside this task and left untouched)

## Form Submission

- Form ID: `quoteForm`
- Action attribute: not present; the existing JavaScript submits to `/send_inquiry.php`
- Method: `POST`
- Encoding: `multipart/form-data`
- Submit control: `button#submitBtn`, `type="submit"`
- Backend endpoint: `send_inquiry.php`
- Submission method: existing `fetch('/send_inquiry.php', { method: 'POST', body: FormData })`

## Fields Before Change

| Label / purpose | Element | Name | ID | Required | Value / notes |
|---|---|---|---|---|---|
| Redirect | hidden input | `redirect` | none | No | `https://www.begapunk.com/thank-you.html` |
| Inquiry type | hidden input | `inquiry_type` | `inquiry_type` | No | Product-page context |
| Source model | hidden input | `source_model` | `source_model` | No | Product-page context |
| Source product | hidden input | `source_product` | `source_product` | No | Product-page context |
| Source page | hidden input | `source_page` | `source_page` | No | Product-page context |
| Source URL | hidden input | `source_url` | `source_url` | No | Product-page context |
| Full Name | text input | `fullname` | `fullname` | Yes | Maximum enforced by PHP: 100 characters |
| Email | email input | `email` | `email` | Yes | Maximum enforced by PHP: 254 characters |
| Company Name | text input | `company` | `company` | Yes | Maximum enforced by PHP: 150 characters |
| Country | select | `country` | `country` | Yes | Fixed country option values |
| What do you need? | select | `product` | `product` | Yes | Values: `standard-model`, `custom`, `replacement`, `not-sure` |
| Technical Requirements | textarea | `requirements` | `requirements` | Yes | Maximum enforced by PHP: 5,000 characters |
| Application / Machine Model | text input | `application` | `application` | No | Maximum enforced by PHP: 500 characters |
| Drawing / photo | file input | `drawing` | `drawing` | No | Existing accept: PDF, STEP/STP, IGES, DWG, DXF, JPG, PNG |
| Anti-spam trap | text input | `honeypot` | `honeypot` | No | Visually hidden, `tabindex="-1"`, `autocomplete="off"` |

## Upload Handling

- Maximum file size: 10 MB in both JavaScript and PHP.
- PHP extensions: PDF, STEP, STP, IGES, IGS, DWG, DXF, JPG, JPEG, PNG.
- PHP validates upload status, size, extension, MIME type, and uploaded-file origin.
- Valid attachments are passed to PHPMailer by `addAttachment()`.
- Pre-change mismatch: the HTML `accept` attribute and visible hint omit `.igs` and `.jpeg`, although PHP accepts them.

## Validation and Messages

- Browser `required` attributes exist on all six backend-required fields.
- Existing JavaScript checks required values, email format, common email-domain typos, extension, and 10 MB size.
- Existing JavaScript displays errors in `#formMessage` and submits using `FormData`.
- Existing success message contains a fixed 24-hour response statement that conflicts with the current no-guaranteed-response policy.
- Backend returns JSON success/error responses and retains generic public errors.

## PHP Field Mapping

`send_inquiry.php` receives: `fullname`, `email`, `company`, `country`, `product`, `application`, `requirements`, `inquiry_type`, `source_model`, `source_product`, `source_page`, `source_url`, `honeypot`, and uploaded file `drawing`.

The HTML-only `redirect` hidden field is preserved but is not consumed by the PHP endpoint.

## SEO, Navigation, and Footer

- SEO: title, canonical, Open Graph, Twitter Card, and ContactPage/LocalBusiness JSON-LD are present.
- Pre-change meta and Twitter descriptions include a 24-hour response statement.
- Header uses the existing global navigation and mobile toggle.
- Footer uses the existing five-column link structure and Privacy/Terms links.
- Privacy notice links to `privacy.html`.
- Existing contact details: `sales@begapunk.com`, `+86 183 6842 5342`, and the factory address at 88 Yugong Road, Zonghan Industrial Park, Cixi, Ningbo, Zhejiang 315300, China.

## Preservation Decision

The refactor may change page layout, labels, helper text, contact-page-only classes, upload hint/accept alignment, accessibility attributes, and the unverified response-time wording. It must not change the backend business logic, field names, select option values, required-field set, hidden source fields, honeypot, upload size, endpoint, navigation links, or footer links.
