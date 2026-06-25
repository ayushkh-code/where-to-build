const LINKEDIN_URL = 'https://www.linkedin.com/in/ayushkhaitan/';

export function CreatorCredit() {
  return (
    <a
      className="creator-credit"
      href={LINKEDIN_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      Built by Ayush Khaitan
    </a>
  );
}
