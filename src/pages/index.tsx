import Head from 'next/head'
import { useState, useEffect } from 'react'
import { Target, Users, Clock, Trophy, Zap } from 'lucide-react'
import WalletButton from '../components/WalletButton'
import ContributionSection from '../components/ContributionSection'
import WalletBalance from '../components/WalletBalance'
import { PayProjectForm } from '../components/pay-project-form'
import { SimplifiedPayment } from '../components/SimplifiedPayment'

// Juicebox API hook - using website scraping for Base network project
function useJuiceboxProject(projectId: number) {
  const [data, setData] = useState({
    totalRaised: 0,
    contributorCount: 0,
    loading: true,
    error: null as string | null
  })

  useEffect(() => {
    async function fetchProjectData() {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }))
        
        // Fetch from our API
        const response = await fetch(`/api/juicebox-data?projectId=${projectId}`)
        
        if (response.ok) {
          const apiData = await response.json()
          
          if (apiData.success) {
            setData({
              totalRaised: apiData.totalRaised || 0,
              contributorCount: apiData.contributorCount || 0,
              loading: false,
              error: null
            })
            return
          }
        }
        
        // If API fails, fall back to manual data
        setData({
          totalRaised: 143, // Current known value
          contributorCount: 3,
          loading: false,
          error: 'Using fallback data - live data temporarily unavailable'
        })
        
      } catch (error) {
        // Fall back to manual data
        setData({
          totalRaised: 143,
          contributorCount: 3,
          loading: false,
          error: 'Using fallback data - live data temporarily unavailable'
        })
      }
    }

    fetchProjectData()
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchProjectData, 60000)
    
    return () => clearInterval(interval)
  }, [projectId])

  return data
}

export default function Home() {
  // Fetch live data from Juicebox project #107 on Base network (Marina Pickleball)
  const { totalRaised, contributorCount, loading, error } = useJuiceboxProject(107)
  
  // Static configuration
  const fundingGoal = 1500 // $1,500 goal
  const goalReached = totalRaised >= fundingGoal
  const daysRemaining = 14 // 2 weeks - you could make this dynamic too

  const progress = Math.min((totalRaised / fundingGoal) * 100, 100)

  return (
    <>
      <Head>
        <title>Marina Pickleball Community Fund</title>
        <meta name="description" content="Two nets in two weeks - Help improve pickleball at Moscone Park" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">MPCF</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-sm text-gray-600">
                Marina Pickleball Community Fund
              </div>
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center bg-primary-100 text-primary-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Two Nets in Two Weeks
            </div>
            
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Marina Pickleball<br />
              <span className="text-primary-600">Community Fund</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Help us raise $1,500 to buy two professional pickleball nets for Moscone Park. 
              Increase game throughput by 50% and make our community courts better for everyone.
            </p>

            {/* Simplified Payment Component */}
            <SimplifiedPayment 
              totalRaised={totalRaised}
              fundingGoal={fundingGoal}
            />

            {/* Legacy Components (kept for reference) */}
            {false && (
              <>
                <WalletBalance />
                <ContributionSection
                  totalRaised={totalRaised}
                  fundingGoal={fundingGoal}
                  progress={progress}
                  loading={loading}
                  error={error}
                />
                <div className="mt-12 mb-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Contribute with JuicePay SDK
                    </h3>
                    <p className="text-gray-600">
                      New payment integration using the official Juicebox SDK
                    </p>
                  </div>
                  <div className="max-w-lg mx-auto">
                    <PayProjectForm />
                  </div>
                </div>
              </>
            )}

            {goalReached && (
              <div className="card max-w-md mx-auto bg-green-50 border-green-200">
                <Trophy className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">Goal Reached! 🎉</h3>
                <p className="text-green-700">
                  Amazing! The Marina pickleball community has come together to fund two new nets. 
                  Thank you to all contributors!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why This Matters</h2>
              <p className="text-lg text-gray-600">
                Making pickleball better for the entire Marina community
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">More Games</h3>
                <p className="text-gray-600">
                  50% increase in game throughput during peak Saturday hours with 6 courts fully equipped.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-secondary-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No More Waiting</h3>
                <p className="text-gray-600">
                  Never rely on volunteers bringing nets from home. Consistent equipment for everyone.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart & Fast</h3>
                <p className="text-gray-600">
                  Using blockchain technology to execute this fund in 2 weeks instead of months.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Fund Allocation */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Fund Allocation</h2>
              <p className="text-lg text-gray-600">
                Complete transparency on how your contributions will be used
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">$1,000</div>
                  <h3 className="text-lg font-semibold mb-2">Equipment</h3>
                  <p className="text-gray-600">Two professional-grade pickleball nets with posts and anchoring systems.</p>
                </div>
              </div>

              <div className="card">
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">$400</div>
                  <h3 className="text-lg font-semibold mb-2">Maintenance</h3>
                  <p className="text-gray-600">Storage, insurance, and ongoing maintenance to keep the nets in great condition.</p>
                </div>
              </div>

              <div className="card">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">$100</div>
                  <h3 className="text-lg font-semibold mb-2">Buffer</h3>
                  <p className="text-gray-600">Unforeseen expenses and potential future improvements to the courts.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">The Team</h2>
              <p className="text-lg text-gray-600">
                Marina pickleballers with the expertise to make this happen
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">SO</span>
                </div>
                <h3 className="text-xl font-semibold mb-1">Sean O'Brien</h3>
                <p className="text-primary-600 font-medium mb-2">Civil Engineer</p>
                <p className="text-gray-600 text-sm">
                  Navigating city regulations and ensuring proper donation procedures.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">PM</span>
                </div>
                <h3 className="text-xl font-semibold mb-1">Pablo Moncada</h3>
                <p className="text-secondary-600 font-medium mb-2">Smart Contract Dev</p>
                <p className="text-gray-600 text-sm">
                  Treasury management and blockchain infrastructure development.
                </p>
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">MM</span>
                </div>
                <h3 className="text-xl font-semibold mb-1">Miguel Moncada</h3>
                <p className="text-green-600 font-medium mb-2">Web Developer</p>
                <p className="text-gray-600 text-sm">
                  Frontend interface and community outreach coordination.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold">Marina Pickleball Community Fund</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Two nets in two weeks. Making pickleball better for everyone in the Marina.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>Built with ❤️ by the pickleball community</span>
              <span>•</span>
              <span>Powered by Ethereum</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
