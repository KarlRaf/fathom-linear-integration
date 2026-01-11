export default function LandingPage() {
  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Meet2Issue
            </h1>
            <p className="text-2xl md:text-3xl font-light mb-8">
              Turn meeting conversations into action items automatically
            </p>
            <p className="text-xl md:text-2xl text-indigo-100 mb-12 max-w-2xl mx-auto">
              AI-powered integration that extracts action items from Fathom calls, 
              reviews them in Slack, and creates Linear issues—so you never lose track of what needs to be done.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/login"
                className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg inline-block text-center"
              >
                Try It Now
              </a>
              <a 
                href="https://github.com/KarlRaf/fathom-linear-integration"
                className="bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-800 transition-colors border-2 border-white/20"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problem + Solution */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Meetings create work. But follow-up shouldn&apos;t.
                </h2>
                <div className="space-y-4 text-gray-600 text-lg">
                  <p>
                    <span className="font-semibold text-gray-900">The Problem:</span> Your team spends hours in meetings, 
                    but critical action items get lost in notes, Slack threads, or email follow-ups.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Action items buried in meeting transcripts</li>
                    <li>Manual entry into project management tools</li>
                    <li>Lost context and forgotten commitments</li>
                    <li>Hours wasted on administrative follow-up</li>
                  </ul>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  The Solution
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  <strong>Meet2Issue</strong> automates the entire workflow using AI:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-3">✓</span>
                    <span>AI extracts actionable items from transcripts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-3">✓</span>
                    <span>Smart review process in Slack</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-3">✓</span>
                    <span>Auto-creates Linear issues with context</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-indigo-600 mr-3">✓</span>
                    <span>Zero manual data entry</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
              How It Works
            </h2>
            <div className="grid md:grid-cols-5 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-indigo-600">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Fathom Call</h3>
                <p className="text-gray-600 text-sm">
                  Meeting recorded and transcript generated
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">AI Extraction</h3>
                <p className="text-gray-600 text-sm">
                  AI analyzes transcript and extracts action items
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-pink-600">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Slack Review</h3>
                <p className="text-gray-600 text-sm">
                  Recap posted with individual approve/reject buttons
                </p>
              </div>

              {/* Arrow (for next row) */}
              <div className="col-span-5 hidden md:flex items-center justify-center py-4">
                <svg className="w-8 h-8 text-gray-400 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>

              {/* Step 4 */}
              <div className="text-center md:col-start-2">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">4</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Linear Issues</h3>
                <p className="text-gray-600 text-sm">
                  Approved items automatically created in Linear
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>

              {/* Step 5 */}
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">5</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">GitHub Log</h3>
                <p className="text-gray-600 text-sm">
                  Transcripts logged by domain for audit trail
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
              Powerful Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Extraction</h3>
                <p className="text-gray-600">
                  Advanced AI analyzes transcripts to identify actionable items with context, assignees, and priorities.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Instant Slack Recap</h3>
                <p className="text-gray-600">
                  Get meeting summaries in Slack immediately after calls, with smart review buttons for each action item.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-pink-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Individual Approval</h3>
                <p className="text-gray-600">
                  Approve or reject each action item independently for granular control over what gets created.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Automated Linear Creation</h3>
                <p className="text-gray-600">
                  Approved items automatically become Linear issues with proper formatting, priorities, and assignees.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Webhooks</h3>
                <p className="text-gray-600">
                  HMAC signature verification ensures only legitimate webhooks from Fathom are processed.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">GitHub Logging</h3>
                <p className="text-gray-600">
                  All transcripts automatically logged to GitHub, organized by domain for easy audit trails and history.
                </p>
              </div>

              {/* Feature 7 */}
              <div className="bg-gray-50 p-6 rounded-xl md:col-start-2 lg:col-start-auto">
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">Serverless Ready</h3>
                <p className="text-gray-600">
                  Built for Vercel serverless functions with Vercel KV for state persistence. Scales automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started */}
      <section id="get-started" className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-center text-xl text-indigo-100 mb-12">
              Deploy on Vercel and connect your tools—no complex setup required.
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12">
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Clone the Repository</h3>
                    <p className="text-indigo-100 mb-3">
                      Get the code from GitHub and install dependencies.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <div className="text-gray-400">$ git clone https://github.com/KarlRaf/fathom-linear-integration.git</div>
                      <div className="text-gray-400">$ cd fathom-linear-integration</div>
                      <div className="text-white">$ npm install</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Configure Credentials</h3>
                    <p className="text-indigo-100 mb-3">
                      Set up your API keys and tokens in Vercel environment variables:
                    </p>
                    <ul className="list-disc list-inside text-indigo-100 space-y-1 ml-4">
                      <li>OpenAI API key</li>
                      <li>Linear API key and team ID</li>
                      <li>Fathom webhook secret</li>
                      <li>GitHub token (optional)</li>
                      <li>Slack credentials (optional)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Deploy to Vercel</h3>
                    <p className="text-indigo-100 mb-3">
                      Connect your GitHub repository to Vercel for automatic deployments.
                    </p>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                      <div className="text-white">$ vercel</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">Connect Fathom</h3>
                    <p className="text-indigo-100">
                      Point your Fathom webhook to your Vercel deployment URL and start recording meetings!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/20 flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/login"
                  className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors inline-block text-center"
                >
                  Launch Application →
                </Link>
                <a 
                  href="https://github.com/KarlRaf/fathom-linear-integration"
                  className="bg-indigo-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-indigo-800 transition-colors inline-block text-center border-2 border-white/20"
                >
                  View Documentation on GitHub →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="text-white font-bold text-xl mb-4">Meet2Issue</h3>
                <p className="text-gray-400">
                  Automatically turn meeting conversations into Linear issues with AI-powered action item extraction.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="https://github.com/KarlRaf/fathom-linear-integration" className="hover:text-white transition-colors">
                      GitHub Repository
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/KarlRaf/fathom-linear-integration/blob/main/README.md" className="hover:text-white transition-colors">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/KarlRaf/fathom-linear-integration/blob/main/SETUP.md" className="hover:text-white transition-colors">
                      Setup Guide
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="https://github.com/KarlRaf/fathom-linear-integration/blob/main/LICENSE" className="hover:text-white transition-colors">
                      MIT License
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center">
              <p className="text-gray-500">
                © 2025 Meet2Issue. Open source project. Built with ❤️ for better meeting follow-up.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
