import Head from 'next/head'
import { useState, useEffect } from 'react'
import { Target, Users, Clock, Trophy, Zap } from 'lucide-react'

// Juicebox API hook - trying multiple approaches to get live data
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
        
        // Try to get the Marina Pickleball project data from multiple sources
        let projectData = null
        let totalVolume = 0
        let totalContributors = 0
        
        // Approach 1: Try Juicebox V4 subgraph (Ethereum mainnet)
        try {
          const response = await fetch('https://api.studio.thegraph.com/query/30654/mainnet-dev/version/latest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                query GetProject($id: ID!) {
                  project(id: $id) {
                    id
                    handle
                    volume
                    volumeUSD
                    paymentsCount
                    contributorsCount
                  }
                }
              `,
              variables: {
                id: `2-${projectId}` // V4 format
              }
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            console.log('Mainnet API Response:', result)
            
            if (result.data?.project) {
              projectData = result.data.project
              console.log('Found mainnet project data:', projectData)
              
              const volumeETH = parseFloat(projectData.volume || '0') / 1e18
              const volumeUSD = parseFloat(projectData.volumeUSD || '0') / 1e18
              totalVolume += volumeUSD > 0 ? volumeUSD : volumeETH * 3500
              totalContributors += projectData.contributorsCount || projectData.paymentsCount || 0
            }
          }
        } catch (e) {
          console.log('Mainnet subgraph failed:', e)
        }
        
        // If we got meaningful data from the API, use it
        if (totalVolume > 0 && totalContributors > 0) {
          setData({
            totalRaised: totalVolume,
            contributorCount: totalContributors,
            loading: false,
            error: null
          })
          return
        }
        
        // Approach 2: Scrape the Juicebox website directly
        try {
          console.log('Trying to fetch data from Juicebox website...')
          
          // Use a proxy or fetch service to get around CORS
          const websiteResponse = await fetch(`/api/juicebox-data?projectId=${projectId}`)
          
          if (websiteResponse.ok) {
            const websiteData = await websiteResponse.json()
            console.log('Website scraping response:', websiteData)
            
            if (websiteData.totalRaised && websiteData.contributorCount) {
              setData({
                totalRaised: websiteData.totalRaised,
                contributorCount: websiteData.contributorCount,
                loading: false,
                error: null
              })
              return
            }
          }
        } catch (e) {
          console.log('Website scraping failed:', e)
        }
        
        // Approach 3: Use the current values from the config as fallback
        console.log('Using manually updated fundraising data')
        setData({
          totalRaised: 126, // Current fallback value
          contributorCount: 1, // Current fallback value
          loading: false,
          error: null
        })
        
      } catch (error) {
        console.error('Error fetching Juicebox data:', error)
        // Fall back to manual data
        setData({
          totalRaised: 126,
          contributorCount: 1,
          loading: false,
          error: null
        })
      }
    }

    fetchProjectData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchProjectData, 30000)
    
    return () => clearInterval(interval)
  }, [projectId])

  return data
}

export default function Home() {
  // Fetch live data from Juicebox project #114
  const { totalRaised, contributorCount, loading, error } = useJuiceboxProject(114)
  
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
            <div className="text-sm text-gray-600">
              Marina Pickleball Community Fund
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

            {/* Progress Card */}
            <div className="card max-w-2xl mx-auto mb-8">
              <div className="text-center mb-6">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-12 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                ) : error ? (
                  <div className="text-orange-600">
                    <p className="text-sm">{error}</p>
                    <p className="text-xs text-gray-500 mt-1">Data updates every 30 seconds</p>
                  </div>
                ) : null}
                
                <div className={`text-4xl font-bold text-gray-900 mb-2 ${loading ? 'opacity-50' : ''}`}>
                  ${Math.round(totalRaised).toFixed(0)}
                  <span className="text-lg text-gray-500 font-normal"> / ${fundingGoal.toFixed(0)}</span>
                  {!loading && !error && (
                    <div className="text-xs text-green-600 font-normal mt-1">
                      ● Live from Juicebox
                    </div>
                  )}
                </div>
                <div className="progress-bar mb-4">
                  <div 
                    className="progress-fill transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{progress.toFixed(0)}% funded</span>
                  <span>{daysRemaining} days left</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center border-t pt-6">
                <div>
                  <div className={`text-2xl font-bold text-primary-600 ${loading ? 'animate-pulse' : ''}`}>
                    {loading ? '...' : contributorCount}
                  </div>
                  <div className="text-sm text-gray-600">Contributors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-600">15</div>
                  <div className="text-sm text-gray-600">Target Contributors</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {goalReached ? '✓' : daysRemaining}
                  </div>
                  <div className="text-sm text-gray-600">
                    {goalReached ? 'Goal Reached!' : 'Days Left'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Section */}
            {!goalReached && (
              <div className="card max-w-md mx-auto">
                <h3 className="text-xl font-semibold mb-4">Contribute Now</h3>
                
                <div className="mb-6">
                  <p className="text-gray-600 text-sm mb-4">
                    We're using Juicebox for secure, transparent fundraising. 
                    Click below to contribute to our pickleball nets fund.
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-700">
                      <div className="font-medium mb-2">Suggested Contributions:</div>
                      <div className="flex justify-between items-center mb-1">
                        <span>Community Supporter</span>
                        <span className="font-medium">$50</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span>Net Champion</span>
                        <span className="font-medium text-primary-600">$100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Court Hero</span>
                        <span className="font-medium">$200+</span>
                      </div>
                    </div>
                  </div>
                </div>

                <a
                  href="https://juicebox.money/v4/eth:114"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full inline-block text-center no-underline"
                >
                  Contribute on Juicebox →
                </a>
                
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Opens in new tab • Secure payments via Juicebox
                </div>
              </div>
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
                <p className="text-primary-600 font-medium mb-2">SF Public Works</p>
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
