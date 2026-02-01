/**
 * Politique de Confidentialité / Privacy Policy page
 */
import { useTranslation } from 'react-i18next';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function PrivacyPolicy() {
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language.startsWith('fr');

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-surface-0/80 backdrop-blur-xl border-b border-primary-100/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <FileText className="w-7 h-7 text-primary-900" />
            <span className="text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              to="/"
              className="btn-ghost text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('legal.backToHome')}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-primary-900 mb-8">
          {t('legal.privacyPolicy.title')}
        </h1>

        <div className="prose prose-primary dark:prose-invert max-w-none space-y-8">
          {isFrench ? (
            <>
              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">1. Responsable du traitement</h2>
                <p className="text-primary-700">
                  Le responsable du traitement des données personnelles est :<br />
                  <strong>Alexandre Eberhardt</strong><br />
                  Contact : <a href="mailto:contact@sivee.pro" className="text-brand hover:underline">contact@sivee.pro</a>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">2. Données collectées</h2>
                <p className="text-primary-700">Nous collectons les données suivantes :</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Données de compte</strong> : adresse email, mot de passe (chiffré et non lisible)</li>
                  <li><strong>Données de CV</strong> : nom, titre professionnel, coordonnées, parcours (formation, expériences, projets, compétences)</li>
                  <li><strong>Données techniques</strong> : adresse IP (logs serveur), données de navigation</li>
                </ul>
                <p className="text-primary-700 mt-3 text-sm">
                  <em>Note : si vous utilisez la connexion Google, nous recevons uniquement votre adresse email
                  et un identifiant technique anonyme permettant de vous reconnecter. Nous n'avons jamais accès
                  à votre mot de passe Google ni à vos autres données Google.</em>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">3. Finalités du traitement</h2>
                <p className="text-primary-700">Vos données sont utilisées pour :</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Créer et gérer votre compte utilisateur</li>
                  <li>Sauvegarder et générer vos CV</li>
                  <li>Améliorer le service (analyse d'utilisation anonymisée)</li>
                  <li>Assurer la sécurité du service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">4. Base légale du traitement</h2>
                <p className="text-primary-700">
                  Le traitement de vos données repose sur :
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Exécution du contrat</strong> : fourniture du service de création de CV</li>
                  <li><strong>Consentement</strong> : lors de la création de compte</li>
                  <li><strong>Intérêt légitime</strong> : sécurité et amélioration du service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">5. Destinataires des données</h2>
                <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg mb-4">
                  <p className="text-success-800 dark:text-success-200 font-medium">
                    Vos données ne sont jamais vendues, louées ou partagées à des fins commerciales ou publicitaires.
                  </p>
                </div>
                <p className="text-primary-700">Vos données sont uniquement transmises aux prestataires techniques nécessaires au fonctionnement du service :</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Mistral AI</strong> (France) : uniquement pour l'extraction automatique de CV importés</li>
                  <li><strong>Amazon Web Services</strong> (France - eu-west-3) : stockage sécurisé des fichiers PDF générés</li>
                  <li><strong>Google</strong> : uniquement si vous choisissez la connexion Google</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">6. Durée de conservation</h2>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Données de compte</strong> : conservées jusqu'à suppression du compte</li>
                  <li><strong>Données de CV</strong> : conservées jusqu'à suppression par l'utilisateur</li>
                  <li><strong>Logs techniques</strong> : 12 mois maximum</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">7. Vos droits</h2>
                <p className="text-primary-700">Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification</strong> : corriger vos données</li>
                  <li><strong>Droit à l'effacement</strong> : supprimer votre compte et vos données</li>
                  <li><strong>Droit à la portabilité</strong> : exporter vos données</li>
                  <li><strong>Droit d'opposition</strong> : vous opposer au traitement</li>
                  <li><strong>Droit de limitation</strong> : limiter le traitement</li>
                </ul>
                <p className="text-primary-700 mt-4">
                  Pour exercer ces droits, rendez-vous dans la section{' '}
                  <Link to="/account" className="text-brand hover:underline">Mon compte</Link>{' '}
                  ou contactez-nous à{' '}
                  <a href="mailto:contact@sivee.pro" className="text-brand hover:underline">contact@sivee.pro</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">8. Cookies</h2>
                <p className="text-primary-700">
                  Sivee.pro n'utilise <strong>aucun cookie de tracking</strong> ni d'analyse.
                </p>
                <p className="text-primary-700">
                  Nous utilisons uniquement le stockage local (localStorage) pour :
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Votre session de connexion (token JWT)</li>
                  <li>Vos préférences (langue, thème)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">9. Sécurité</h2>
                <p className="text-primary-700">
                  Nous mettons en œuvre des mesures de sécurité appropriées :
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Chiffrement des mots de passe (bcrypt)</li>
                  <li>Connexion HTTPS obligatoire</li>
                  <li>Tokens JWT avec expiration</li>
                  <li>Protection contre les attaques (CORS, rate limiting)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">10. Réclamation</h2>
                <p className="text-primary-700">
                  Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation
                  auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) :{' '}
                  <a href="https://www.cnil.fr" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                    www.cnil.fr
                  </a>
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">1. Data Controller</h2>
                <p className="text-primary-700">
                  The data controller for personal data is:<br />
                  <strong>Alexandre Eberhardt</strong><br />
                  Contact: <a href="mailto:contact@sivee.pro" className="text-brand hover:underline">contact@sivee.pro</a>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">2. Data Collected</h2>
                <p className="text-primary-700">We collect the following data:</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Account data</strong>: email address, password (encrypted and unreadable)</li>
                  <li><strong>Resume data</strong>: name, professional title, contact information, background (education, experience, projects, skills)</li>
                  <li><strong>Technical data</strong>: IP address (server logs), navigation data</li>
                </ul>
                <p className="text-primary-700 mt-3 text-sm">
                  <em>Note: if you use Google sign-in, we only receive your email address
                  and an anonymous technical identifier to recognize you on future logins. We never have access
                  to your Google password or any other Google data.</em>
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">3. Purpose of Processing</h2>
                <p className="text-primary-700">Your data is used to:</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Create and manage your user account</li>
                  <li>Save and generate your resumes</li>
                  <li>Improve the service (anonymized usage analysis)</li>
                  <li>Ensure service security</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">4. Legal Basis</h2>
                <p className="text-primary-700">
                  The processing of your data is based on:
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Contract execution</strong>: providing the resume creation service</li>
                  <li><strong>Consent</strong>: when creating an account</li>
                  <li><strong>Legitimate interest</strong>: security and service improvement</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">5. Data Recipients</h2>
                <div className="p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg mb-4">
                  <p className="text-success-800 dark:text-success-200 font-medium">
                    Your data is never sold, rented, or shared for commercial or advertising purposes.
                  </p>
                </div>
                <p className="text-primary-700">Your data is only transmitted to technical providers required for the service to function:</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Mistral AI</strong> (France): only for automatic extraction of imported resumes</li>
                  <li><strong>Amazon Web Services</strong> (France - eu-west-3): secure storage of generated PDF files</li>
                  <li><strong>Google</strong>: only if you choose Google sign-in</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">6. Data Retention</h2>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Account data</strong>: retained until account deletion</li>
                  <li><strong>Resume data</strong>: retained until deleted by user</li>
                  <li><strong>Technical logs</strong>: 12 months maximum</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">7. Your Rights</h2>
                <p className="text-primary-700">Under GDPR, you have the following rights:</p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li><strong>Right of access</strong>: obtain a copy of your data</li>
                  <li><strong>Right to rectification</strong>: correct your data</li>
                  <li><strong>Right to erasure</strong>: delete your account and data</li>
                  <li><strong>Right to portability</strong>: export your data</li>
                  <li><strong>Right to object</strong>: object to processing</li>
                  <li><strong>Right to restriction</strong>: limit processing</li>
                </ul>
                <p className="text-primary-700 mt-4">
                  To exercise these rights, go to the{' '}
                  <Link to="/account" className="text-brand hover:underline">My Account</Link>{' '}
                  section or contact us at{' '}
                  <a href="mailto:contact@sivee.pro" className="text-brand hover:underline">contact@sivee.pro</a>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">8. Cookies</h2>
                <p className="text-primary-700">
                  Sivee.pro uses <strong>no tracking or analytics cookies</strong>.
                </p>
                <p className="text-primary-700">
                  We only use local storage (localStorage) for:
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Your login session (JWT token)</li>
                  <li>Your preferences (language, theme)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">9. Security</h2>
                <p className="text-primary-700">
                  We implement appropriate security measures:
                </p>
                <ul className="list-disc list-inside text-primary-700 space-y-2">
                  <li>Password encryption (bcrypt)</li>
                  <li>Mandatory HTTPS connection</li>
                  <li>JWT tokens with expiration</li>
                  <li>Protection against attacks (CORS, rate limiting)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-primary-900 mb-4">10. Complaints</h2>
                <p className="text-primary-700">
                  If you believe your rights are not being respected, you can file a complaint
                  with the CNIL (French Data Protection Authority):{' '}
                  <a href="https://www.cnil.fr" className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">
                    www.cnil.fr
                  </a>
                </p>
              </section>
            </>
          )}
        </div>

        <p className="text-sm text-primary-400 mt-12">
          {t('legal.lastUpdated')}: {new Date().toLocaleDateString(i18n.language)}
        </p>
      </main>
    </div>
  );
}
