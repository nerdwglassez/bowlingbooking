'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DateAndTimeStepOne from '@/components/booking/DateAndTimeStepOne'
import GuestCheckout from '@/components/booking/GuestCheckout'
import LoginPrompt from '@/components/booking/LoginPrompt'
import SignUpFormInline from '@/components/booking/SignUpFormInline'
import StripePaymentForm from '@/components/booking/StripePaymentForm'
import PackageDetailPanel from '@/components/booking/PackageDetailPanel'
import PackageSelectionCard from '@/components/booking/PackageSelectionCard'
import BookingSummary from '@/components/booking/BookingSummary'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import {
  BookingStepActions,
  BookingStepLayout,
  BookingStepSection,
} from '@/components/shared/booking/BookingStepLayout'
import { Plus, X, ChevronDown, CircleUser, Lock, CheckCircle2, Shield, Info } from 'lucide-react'
import { format } from 'date-fns'
import {
  calculateBookingPrice,
  calculateBookingPriceWithSettings,
  type BookingPriceBreakdown,
} from '@/lib/pricing'
import { righteous } from '@/lib/fonts'
import {
  canSubmitBooking as canSubmitBookingRule,
  getBowlerInfoCompletionState,
  getNumLanesForBowlers,
  getShoeRentalCounts,
  getShoeSizeValues,
} from '@/lib/booking/rules'
import {
  filterPackagesByCategory,
  getPackageCategoryOptions,
  packagePriceList,
  packageTotalPrice,
  selectedPackageData,
  togglePackageSelection,
} from '@/lib/booking/packages'
import { useBookingCatalog } from '@/hooks/useBookingCatalog'
import { useBookingCheckoutFlow } from '@/hooks/useBookingCheckoutFlow'

/** Shared styles so step Back/Continue buttons align and are pill-shaped (Figma: pill CTA). */
const STEP_NAV_BUTTON = 'rounded-full min-h-[48px] px-6'

interface Package {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  imageUrl?: string | null
  durationMinutes?: number | null
  baseGuestCount?: number | null
  maxCapacity?: number | null
  pricePerExtraGuest?: number | null
  pricePerExtraLane?: number | null
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  type: string
}

type CreateBookingPayload = {
  date: string
  startTime: string
  duration: number
  numLanes: number
  lane?: number
  numBowlers: number
  shoeSizes: number[]
  packageIds: string[]
  productItems: Array<{ productId: string; quantity: number }>
  termsAccepted: boolean
  loyaltyPointsToRedeem?: number
  giftCardCode?: string
  giftCardAmountToApply?: number
  discountCode?: string
}

export default function BookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [duration] = useState<number>(60) // Fixed 1 hour; not shown in Step 1
  const [lane, setLane] = useState<number>(1)
  const [numBowlers, setNumBowlers] = useState<number>(2)
  /** Per-bowler: number = shoe size, null = own shoes, undefined = not chosen yet */
  const [shoeRentals, setShoeRentals] = useState<(number | null | undefined)[]>([undefined, undefined])
  // Lanes derived from bowlers: 1 lane per 6 bowlers (1–6 → 1, 7–12 → 2, etc.), max 5
  const numLanes = getNumLanesForBowlers(numBowlers)
  const {
    packages,
    products,
    pricingSettings,
  } = useBookingCatalog()
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({}) // productId -> quantity
  const {
    loading,
    error,
    setError,
    createdBookingId,
    paymentClientSecret,
    createBooking,
    confirmPayment,
    resetPaymentState,
    registerGuestAndCreateBooking,
    createBookingAfterLogin,
  } = useBookingCheckoutFlow({
    onConfirmed: (bookingId) => {
      router.push(`/book/confirmation?bookingId=${bookingId}`)
    },
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [checkoutMode, setCheckoutMode] = useState<'signup' | 'login' | 'guest' | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0)
  const [loyaltyData, setLoyaltyData] = useState<{
    balance: number
    tier: string
    minRedemptionPoints: number
    redemptionCentsPer100Points: number
    maxRedeemable: number | null
  } | null>(null)
  const [giftCardCode, setGiftCardCode] = useState('')
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null)
  const [giftCardAmountToApply, setGiftCardAmountToApply] = useState(0)
  const [giftCardError, setGiftCardError] = useState<string | null>(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoPreview, setPromoPreview] = useState<{
    paymentMode: 'ONLINE' | 'INVOICE'
    description: string
    adjustedTotal: number | null
  } | null>(null)
  const [isPartyEvent, setIsPartyEvent] = useState(false)
  const [partyType, setPartyType] = useState('')
  const [step1ValidationAttempted, setStep1ValidationAttempted] = useState(false)
  const [step1Shake, setStep1Shake] = useState(false)
  const [step1ShowToast, setStep1ShowToast] = useState(false)
  const [detailPanelPackageId, setDetailPanelPackageId] = useState<string | null>(null)
  const [packageCategoryFilter, setPackageCategoryFilter] = useState<string | null>(null) // null = All, 'PARTY', 'FOOD', 'DRINK', 'ARCADE'
  const [mobileStep2SummaryExpanded, setMobileStep2SummaryExpanded] = useState(false)
  const STEP1_STORAGE_KEY = 'booking_step1'

  /** Booking price breakdown using staff settings when available, so UI matches final charge. */
  function getBreakdown(
    durationMinutes: number,
    numShoes: number,
    packagePrices: number[],
    productTotal: number,
    numLanesCount: number
  ): BookingPriceBreakdown {
    if (pricingSettings) {
      return calculateBookingPriceWithSettings(
        pricingSettings,
        durationMinutes,
        numBowlers,
        numShoes,
        packagePrices,
        productTotal,
        numLanesCount
      )
    }
    return calculateBookingPrice(
      durationMinutes,
      numShoes,
      packagePrices,
      productTotal,
      numLanesCount
    )
  }

  // Check authentication status
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          setIsAuthenticated(true)
        } else {
          setIsAuthenticated(false)
        }
      })
      .catch(() => setIsAuthenticated(false))
  }, [])

  // Scroll to top when step changes so each step loads with the page at the top
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [step])

  // Pre-fill from URL; otherwise default to today.
  // If restoring from localStorage, only restore values for today's date so Step 1
  // always opens with the current date selected and matching times visible.
  useEffect(() => {
    const date = searchParams?.get('date')
    const time = searchParams?.get('time')
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    if (date) setSelectedDate(date)
    if (time) setSelectedTime(time)
    if (!date && !time && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STEP1_STORAGE_KEY)
        if (raw) {
          const data = JSON.parse(raw) as { date?: string; time?: string }
          if (data.date === todayKey) {
            setSelectedDate(todayKey)
            if (data.time) setSelectedTime(data.time)
          }
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams])

  const handleTimeSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
  }

  const setNumBowlersWithRentals = (n: number) => {
    setNumBowlers(n)
    setShoeRentals(prev => {
      if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(undefined)]
      if (n < prev.length) return prev.slice(0, n)
      return prev
    })
  }

  const setShoeForBowler = (index: number, value: number | null | undefined) => {
    setShoeRentals(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  /** Dropdown value for shoe row: '' = unset, 'own' = bring own shoes (no charge), number string = size */
  const getShoeDropdownValue = (val: number | null | undefined): string => {
    if (val === null) return 'own'
    if (val === undefined || val === 0) return ''
    return String(val)
  }
  const setShoeFromDropdown = (index: number, selectValue: string) => {
    if (selectValue === 'own') setShoeForBowler(index, null)
    else if (selectValue === '') setShoeForBowler(index, undefined)
    else setShoeForBowler(index, Number(selectValue))
  }

  const removeBowlerAt = (index: number) => {
    if (index <= 0 || numBowlers <= 1) return
    setShoeRentals(prev => prev.filter((_, i) => i !== index))
    setNumBowlers(prev => Math.max(1, prev - 1))
  }

  const { numShoeRentals, numOwnShoes } = getShoeRentalCounts(shoeRentals)
  const shoeSizeValues = getShoeSizeValues(shoeRentals)
  const productLineItems = Object.entries(selectedProducts)
    .filter(([, q]) => q > 0)
    .map(([productId, quantity]) => {
      const p = products.find((pr) => pr.id === productId)
      return { productId, name: p?.name ?? '', price: Number(p?.price ?? 0), quantity }
    })
  const { isBowlerInfoComplete } = getBowlerInfoCompletionState(numBowlers, shoeRentals)
  const canSubmitBooking = canSubmitBookingRule({
    selectedDate,
    selectedTime,
    isBowlerInfoComplete,
    termsAccepted,
    loading,
  })

  /** Shoe sizes 1–15 in half steps; stored value is the numeric size (men's/boy's). */
  const SHOE_SIZE_OPTIONS = Array.from({ length: 29 }, (_, i) => 1 + i * 0.5)
  /** Format for dropdown: youth (1–6) as girl's/boy's, adult (6.5+) as women's/men's (US: women's = men's + 1.5). */
  const getShoeSizeLabel = (size: number): string => {
    const menLabel = size % 1 === 0 ? String(size) : size.toFixed(1)
    if (size <= 6) return `Girl's ${menLabel} / Boy's ${menLabel}`
    const womens = size + 1.5
    const womenLabel = womens % 1 === 0 ? String(womens) : womens.toFixed(1)
    return `Women's ${womenLabel} / Men's ${menLabel}`
  }

  const togglePackage = (packageId: string) => {
    setSelectedPackages((prev) => togglePackageSelection(prev, packageId))
  }

  const handleAddPackageToCart = (packageId: string, _extraGuests?: number, _extraLanes?: number) => {
    // For now, just add the package ID. Extra guests/lanes customization can be stored later if backend supports it.
    setSelectedPackages((prev) => (prev.includes(packageId) ? prev : [...prev, packageId]))
  }

  const categoryOptions: Array<{ value: string | null; label: string }> = [...getPackageCategoryOptions()]
  const filteredPackages = filterPackagesByCategory(packages, packageCategoryFilter)
  const selectedPackagesData = selectedPackageData(packages, selectedPackages)
  const totalPackagePrice = packageTotalPrice(selectedPackagesData)
  const step2PackagePrices = packagePriceList(packages, selectedPackages)
  const step2ProductTotal = Object.entries(selectedProducts).reduce(
    (sum, [productId, q]) => sum + (Number(products.find(p => p.id === productId)?.price ?? 0) * q),
    0
  )
  const step2Breakdown = getBreakdown(duration, numShoeRentals, step2PackagePrices, step2ProductTotal, numLanes)

  useEffect(() => {
    if (step === 2 && selectedPackages.length > 0) {
      setMobileStep2SummaryExpanded(true)
    }
  }, [step, selectedPackages.length])

  const buildCreateBookingPayload = (): CreateBookingPayload => ({
    date: selectedDate,
    startTime: selectedTime,
    duration,
    numLanes,
    lane: numLanes === 1 ? lane : undefined,
    numBowlers,
    shoeSizes: shoeSizeValues,
    packageIds: selectedPackages,
    productItems: Object.entries(selectedProducts)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({ productId, quantity })),
    termsAccepted: true,
    ...(loyaltyPointsToRedeem > 0 ? { loyaltyPointsToRedeem } : {}),
    ...(giftCardCode.trim() && giftCardAmountToApply > 0
      ? { giftCardCode: giftCardCode.trim(), giftCardAmountToApply }
      : {}),
    ...(appliedPromoCode ? { discountCode: appliedPromoCode } : {}),
  })

  const runCreateBooking = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a date and time')
      return
    }
    await createBooking(buildCreateBookingPayload())
  }

  const handleGuestCheckout = async (guestData: { email: string; firstName: string; lastName: string; phone: string }) => {
    await registerGuestAndCreateBooking(guestData, buildCreateBookingPayload())
    setIsAuthenticated(true)
  }

  const handleLoginSuccess = async () => {
    setIsAuthenticated(true)
    setCheckoutMode(null)
    createBookingAfterLogin(buildCreateBookingPayload())
  }

  // Fetch loyalty when on step 4 and authenticated (for "use points" option)
  useEffect(() => {
    if (step !== 4 || !isAuthenticated) return
    const packagePrices = selectedPackages.map(
      (id) => Number(packages.find((p) => p.id === id)?.price ?? 0)
    )
    const productTotal = Object.entries(selectedProducts).reduce(
      (sum, [productId, q]) =>
        sum + (Number(products.find((p) => p.id === productId)?.price ?? 0) * q),
      0
    )
    const breakdown = getBreakdown(duration, numShoeRentals, packagePrices, productTotal, numLanes)
    fetch(`/api/loyalty?total=${breakdown.total}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setLoyaltyData({
          balance: data.balance,
          tier: data.tier,
          minRedemptionPoints: data.minRedemptionPoints,
          redemptionCentsPer100Points: data.redemptionCentsPer100Points,
          maxRedeemable: data.maxRedeemable,
        })
      })
      .catch(() => setLoyaltyData(null))
  }, [step, isAuthenticated, selectedPackages, selectedProducts, packages, products, duration, numShoeRentals, numLanes, numBowlers, pricingSettings])

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    await confirmPayment(paymentIntentId)
  }

  const handlePaymentCancel = () => {
    resetPaymentState()
  }

  const handleSubmit = async () => {
    if (isAuthenticated === false) {
      setCheckoutMode(null)
      return
    }
    await runCreateBooking()
  }

  const stepLabels = ['Date & Time', 'Packages & Extras', 'Booking Details', 'Review & Payment']
  const stepSubtitles: Record<number, string> = {
    1: 'Select your preferred date and time to get started',
    2: 'Add packages to make your visit extra special.',
    3: 'Tell us about your group',
    4: 'Review your booking and complete payment.',
  }

  return (
    <main
      className="min-h-screen bg-[#F9FAFB] px-4 sm:px-6 lg:px-[30.5px] pt-6 sm:pt-8 pb-16 sm:pb-20 lg:pb-[96px]"
    >
      <Toast
        message="Please select both a date and time"
        visible={step1ShowToast}
        onDismiss={() => setStep1ShowToast(false)}
        autoDismissMs={3000}
      />
      <div className="mx-auto max-w-[1341px] px-0 sm:px-4 lg:px-8" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Unified step header: Righteous headline + step subtitle (Figma 111-410) */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1
            className={`${righteous.className} font-normal leading-[1.2] text-3xl sm:text-4xl lg:text-[40px]`}
            style={{ color: '#1A237E' }}
          >
            Reserve Your Lane
          </h1>
          <p className="text-center leading-[1.5em]" style={{ fontSize: 16, color: '#717182' }}>
            {stepSubtitles[step] ?? stepLabels[step - 1]}
          </p>
        </div>

        {/* Figma 19-381: layout_E7THYB row center gap 10px; layout_JMTNY2 fill_IOZ5RB gradient 166deg; layout_C4LS6K fill_0FC5QO #E2E8F0 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-[10px]">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="rounded-full origin-center transition-[width,background-color,transform] duration-300 ease-out"
                style={
                  step === s
                    ? {
                        width: 32,
                        height: 8,
                        background: 'linear-gradient(166deg, rgba(99, 102, 241, 1) 0%, rgba(59, 130, 246, 1) 100%)',
                        transform: 'scale(1)',
                      }
                    : {
                        width: 6.4,
                        height: 8,
                        background: '#E2E8F0',
                        transform: 'scale(0.98)',
                      }
                }
                title={stepLabels[s - 1]}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Date and time only (Figma: Reserve Your Lane – select date and time) */}
        {step === 1 && (
          <BookingStepLayout>
            {step1ValidationAttempted && (!selectedDate || !selectedTime) && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ borderColor: '#FECACA', background: '#FEF2F2', color: '#B91C1C' }}
                role="alert"
              >
                Please select a date and a time to continue.
              </div>
            )}
            <DateAndTimeStepOne
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateSelect={setSelectedDate}
              onTimeSelect={handleTimeSelect}
              minLanes={1}
            />
            <BookingStepActions align="end" className="border-0 pt-0 mt-0">
              <Button
                onClick={() => {
                  if (!selectedDate || !selectedTime) {
                    setStep1ValidationAttempted(true)
                    setStep1ShowToast(true)
                    setStep1Shake(true)
                    setTimeout(() => setStep1Shake(false), 400)
                    return
                  }
                  setStep1ValidationAttempted(false)
                  setStep1ShowToast(false)
                  if (typeof window !== 'undefined') {
                    try {
                      localStorage.setItem(
                        STEP1_STORAGE_KEY,
                        JSON.stringify({ date: selectedDate, time: selectedTime })
                      )
                    } catch {
                      // ignore
                    }
                  }
                  setStep(2)
                }}
                disabled={!selectedDate || !selectedTime}
                className={`rounded-full min-h-[48px] px-6 ${!(selectedDate && selectedTime) ? 'opacity-60' : ''} ${step1Shake ? 'step1-button-shake' : ''}`}
              >
                Continue to details
              </Button>
            </BookingStepActions>
          </BookingStepLayout>
        )}

        {/* Step 3: Booking Details — Figma 114-935 bowler info */}
        {step === 3 && (
          <BookingStepLayout>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_384px] gap-6 xl:gap-8 items-start">
              {/* Left: Bowler form card — Who's bowling? / Shoe sizes; dropdown matches Select/step-one pill style */}
              <BookingStepSection className="p-4 sm:p-6 lg:p-[25px]">
                <h2 className="text-[20px] leading-[1.5] font-bold text-[#0F172A] mb-1">Who&apos;s bowling?</h2>
                <p className="text-base font-normal text-[#0F172A] text-[#64748B] mb-6">Shoe sizes</p>

                <div className="space-y-3">
                  {Array.from({ length: numBowlers }, (_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[#E2E8F0] px-4 py-3 bg-gray-50 flex items-center gap-3"
                    >
                      <div className="h-8 w-8 rounded-[10px] bg-[#EEF2FF] flex items-center justify-center flex-shrink-0">
                        <CircleUser className="h-4 w-4 text-[#6366F1]" aria-hidden />
                      </div>
                      <span className="text-base font-medium text-[#0F172A] min-w-[72px]">Bowler {i + 1}</span>
                      <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                        <div className="relative w-full sm:w-[200px]">
                          <select
                            value={getShoeDropdownValue(shoeRentals[i])}
                            onChange={(e) => setShoeFromDropdown(i, e.target.value)}
                            className="w-full min-h-[48px] appearance-none rounded-full border-2 border-[#E2E8F0] px-6 py-3 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:border-[#6366F1] disabled:opacity-50"
                            style={{
                              background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 100%), linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(59,130,246,0.2) 100%), #FFFFFF',
                            }}
                          >
                            <option value="">Select shoe size...</option>
                            <option value="own">Bring my own shoes</option>
                            {SHOE_SIZE_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{getShoeSizeLabel(opt)}</option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
                            aria-hidden
                          />
                        </div>
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => removeBowlerAt(i)}
                            className="h-8 w-8 rounded-full border-2 border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B] hover:border-[#CBD5E1] flex items-center justify-center flex-shrink-0"
                            aria-label={`Remove bowler ${i + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNumBowlersWithRentals(Math.min(10, numBowlers + 1))}
                  disabled={numBowlers >= 10}
                  className="mt-4 w-full rounded-full border-2 border-[#6366F1] bg-white px-4 py-3 text-[#6366F1] text-base font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400"
                >
                  <Plus className="h-4 w-4" />
                  Add bowler
                </button>
              </BookingStepSection>

              {/* Right: Booking summary — step 3; column stretches on lg so sticky follows scroll */}
              <div className="lg:self-stretch">
                <BookingSummary
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  durationMinutes={duration}
                  numBowlers={numBowlers}
                  numLanes={numLanes}
                  numShoeRentals={numShoeRentals}
                  numOwnShoes={numOwnShoes}
                  packages={selectedPackagesData}
                  productLineItems={productLineItems}
                  breakdown={step2Breakdown}
                  isPartyEvent={isPartyEvent}
                  partyType={partyType}
                  variant="sidebar"
                />
              </div>
            </div>

            {/* CTAs below the card/summary — same pattern as step 1 (Figma) */}
            <BookingStepActions>
              <Button variant="secondary" onClick={() => setStep(2)} className={`${STEP_NAV_BUTTON} w-full sm:w-auto !bg-white !text-[#6366F1] !border !border-[#6366F1]/30 hover:!bg-[#F8FAFF]`}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={!isBowlerInfoComplete}
                className={`${STEP_NAV_BUTTON} w-full sm:w-auto disabled:!bg-[#E2E8F0] disabled:!text-[#94A3B8]`}
              >
                Continue to review
              </Button>
            </BookingStepActions>
            {!isBowlerInfoComplete && (
              <p className="text-sm text-[#64748B] -mt-2">
                Choose a shoe size or &quot;Bring my own shoes&quot; for each bowler to continue.
              </p>
            )}
          </BookingStepLayout>
        )}

        {/* Step 2: Packages - Figma step2.0-desktop-package-selection */}
        {step === 2 && (
          <BookingStepLayout>
            {/* Mobile: shared BookingSummary (collapsible) */}
            <BookingSummary
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              durationMinutes={duration}
              numBowlers={numBowlers}
              numLanes={numLanes}
              numShoeRentals={numShoeRentals}
              numOwnShoes={numOwnShoes}
              packages={selectedPackagesData}
              productLineItems={productLineItems}
              breakdown={step2Breakdown}
              isPartyEvent={isPartyEvent}
              partyType={partyType}
              variant="mobile-collapsible"
              expanded={mobileStep2SummaryExpanded}
              onToggleExpand={() => setMobileStep2SummaryExpanded((prev) => !prev)}
              onRemovePackage={togglePackage}
            />

            {/* Category tabs: Figma CategoryTabs - pill buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categoryOptions.map((cat) => {
                const isSelected = packageCategoryFilter === cat.value
                return (
                  <button
                    key={cat.value || 'all'}
                    type="button"
                    onClick={() => setPackageCategoryFilter(cat.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Package grid + Booking summary: same sidebar width as steps 3 & 4 (responsive) */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_384px] gap-6 xl:gap-8 items-start">
              {/* Package cards grid */}
              <div>
                {filteredPackages.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <p>No packages available in this category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 xl:gap-5">
                    {filteredPackages.map((pkg) => (
                      <PackageSelectionCard
                        key={pkg.id}
                        pkg={pkg}
                        isSelected={selectedPackages.includes(pkg.id)}
                        onToggleAdd={() => togglePackage(pkg.id)}
                        onOpenDetails={() => setDetailPanelPackageId(pkg.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Desktop: BookingSummary sidebar — same width as step 3 & 4; column stretches so sticky can follow scroll */}
              <div className="hidden lg:block lg:self-stretch">
                <BookingSummary
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  durationMinutes={duration}
                  numBowlers={numBowlers}
                  numLanes={numLanes}
                  numShoeRentals={numShoeRentals}
                  numOwnShoes={numOwnShoes}
                  packages={selectedPackagesData}
                  productLineItems={productLineItems}
                  breakdown={step2Breakdown}
                  isPartyEvent={isPartyEvent}
                  partyType={partyType}
                  variant="sidebar"
                  onRemovePackage={togglePackage}
                />
              </div>
            </div>

            {/* Navigation */}
            <BookingStepActions>
              <Button variant="secondary" onClick={() => setStep(1)} className={`${STEP_NAV_BUTTON} w-full sm:w-auto !bg-white !text-[#6366F1] !border !border-[#6366F1]/30 hover:!bg-[#F8FAFF]`}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className={`${STEP_NAV_BUTTON} w-full sm:w-auto`}>Continue to bowler details</Button>
            </BookingStepActions>
          </BookingStepLayout>
        )}

        {/* Step 4: Review & Payment — Figma 117-1339: two-column layout, Review / Create Account / Payment cards */}
        {step === 4 && (() => {
          const accountTab = checkoutMode ?? 'signup'

          return (
          <BookingStepLayout>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_384px] gap-6 xl:gap-8 items-start">
              {/* Left column: Create Your Account + Payment Method (no Review your booking card) */}
              <div className="space-y-6">
                {/* Card 1: Create Your Account — Sign Up / Login / Guest tabs */}
                <BookingStepSection className="p-6">
                  <h3 className="text-[20px] font-semibold text-[#0F172A] mb-2">Create Your Account</h3>
                  <p className="text-sm text-[#64748B] mb-4">Save your booking details and get exclusive member benefits</p>
                  <div className="flex gap-2 mb-4">
                    {(['signup', 'login', 'guest'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setCheckoutMode(tab)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          accountTab === tab
                            ? 'bg-[#6366F1] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tab === 'signup' ? 'Sign Up' : tab === 'login' ? 'Login' : 'Guest'}
                      </button>
                    ))}
                  </div>
                  {accountTab === 'signup' && (
                    <SignUpFormInline
                      onSuccess={handleLoginSuccess}
                      isLoading={loading}
                    />
                  )}
                  {accountTab === 'login' && (
                    <LoginPrompt
                      onLoginSuccess={handleLoginSuccess}
                      onGuestClick={() => setCheckoutMode('guest')}
                      isLoading={loading}
                    />
                  )}
                  {accountTab === 'guest' && (
                    <GuestCheckout
                      onGuestSubmit={handleGuestCheckout}
                      onLoginClick={() => setCheckoutMode('login')}
                      isLoading={loading}
                    />
                  )}
                </BookingStepSection>

                {/* Card 2: Payment Method */}
                <BookingStepSection className="p-6">
                  <h3 className="text-[20px] font-semibold text-[#0F172A] mb-4">Payment Method</h3>
                  {paymentClientSecret && createdBookingId ? (
                    <StripePaymentForm
                      clientSecret={paymentClientSecret}
                      bookingId={createdBookingId}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 rounded-xl bg-[#EEF2FF] text-[#6366F1] px-4 py-3 mb-4">
                        <Lock className="h-5 w-5 flex-shrink-0" aria-hidden />
                        <span className="font-medium">Secure payment with Stripe</span>
                      </div>
                      <ul className="space-y-2 text-sm text-[#64748B] mb-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" aria-hidden />
                          256-bit SSL encryption
                        </li>
                        <li className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" aria-hidden />
                          PCI Compliant – industry-standard security
                        </li>
                        <li className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-[#94A3B8] flex-shrink-0" aria-hidden />
                          Your card information is never stored on our servers. All payment processing is handled securely by Stripe.
                        </li>
                      </ul>
                      <p className="text-xs text-[#94A3B8]">We accept: VISA, MASTERCARD, AMEX</p>
                    </>
                  )}
                </BookingStepSection>

            {/* Promo / corporate code */}
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100">
              <h3 className="font-medium text-gray-900 mb-2">Promo or corporate code</h3>
              {!appliedPromoCode ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value)
                      setPromoError(null)
                    }}
                    className="rounded border border-gray-300 px-3 py-2 text-sm w-full sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const code = promoCodeInput.replace(/\s/g, '')
                      if (!code) return
                      setPromoError(null)
                      try {
                        const totalCents = Math.round(step2Breakdown.total * 100)
                        const res = await fetch('/api/discount-codes/preview', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ code, totalCentsBeforeCode: totalCents }),
                        })
                        const data = await res.json()
                        if (res.status === 401) {
                          setPromoError('Please sign in (or continue as guest) before applying a code.')
                          return
                        }
                        if (!data.valid) {
                          setPromoError(data.error || 'Invalid code')
                          return
                        }
                        setAppliedPromoCode(code.toUpperCase())
                        setPromoPreview({
                          paymentMode: data.paymentMode,
                          description: data.description,
                          adjustedTotal: data.adjustedTotal,
                        })
                      } catch {
                        setPromoError('Could not validate code')
                      }
                    }}
                    className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                  {promoError && <span className="text-sm text-red-600">{promoError}</span>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-800">
                    <span className="font-mono font-semibold">{appliedPromoCode}</span>
                    {' — '}
                    {promoPreview?.description}
                    {promoPreview?.paymentMode === 'INVOICE' && (
                      <span className="block mt-1 text-indigo-800 font-medium">
                        Invoice checkout: no card required. Your booking will be confirmed; payment will be invoiced.
                      </span>
                    )}
                    {promoPreview?.adjustedTotal != null && promoPreview.paymentMode === 'ONLINE' && (
                      <span className="block mt-1 text-gray-600">
                        Estimated total after code (before points/gift card): ${promoPreview.adjustedTotal.toFixed(2)}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedPromoCode(null)
                      setPromoPreview(null)
                      setPromoCodeInput('')
                      setPromoError(null)
                    }}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Remove code
                  </button>
                </div>
              )}
            </div>

            {/* Gift card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-[#E2E8F0]">
              <h3 className="font-medium text-gray-900 mb-2">Gift card</h3>
              {!giftCardBalance ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. BOWL-XXXX-XXXX)"
                    value={giftCardCode}
                    onChange={(e) => {
                      setGiftCardCode(e.target.value)
                      setGiftCardError(null)
                    }}
                    className="rounded border border-gray-300 px-3 py-2 text-sm w-full sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const code = giftCardCode.replace(/\s/g, '').toUpperCase()
                      if (!code) return
                      setGiftCardError(null)
                      try {
                        const res = await fetch(`/api/gift-cards/validate?code=${encodeURIComponent(code)}`)
                        const data = await res.json()
                        if (res.status === 401) {
                          setGiftCardError('Please sign in (or continue as guest) before applying a gift card.')
                          return
                        }
                        if (data.valid && data.balance > 0) {
                          setGiftCardBalance(data.balance)
                          setGiftCardCode(code)
                        } else {
                          setGiftCardError(data.error || 'Invalid gift card')
                        }
                      } catch {
                        setGiftCardError('Could not validate code')
                      }
                    }}
                    className="rounded-lg bg-gray-700 text-white px-4 py-2 text-sm font-medium hover:bg-gray-800"
                  >
                    Apply
                  </button>
                  {giftCardError && (
                    <span className="text-sm text-red-600">{giftCardError}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-gray-700">
                    Code <strong>{giftCardCode}</strong> — balance ${giftCardBalance.toFixed(2)}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={giftCardBalance}
                    step={0.01}
                    value={giftCardAmountToApply || ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (Number.isNaN(v)) setGiftCardAmountToApply(0)
                      else setGiftCardAmountToApply(Math.max(0, Math.min(v, giftCardBalance)))
                    }}
                    placeholder="Amount to apply"
                    className="w-full sm:w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setGiftCardAmountToApply(giftCardBalance)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Use full balance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGiftCardBalance(null)
                      setGiftCardAmountToApply(0)
                      setGiftCardCode('')
                      setGiftCardError(null)
                    }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Loyalty: use points (only when signed in and have enough points) */}
            {isAuthenticated && loyaltyData && loyaltyData.balance >= loyaltyData.minRedemptionPoints && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <h3 className="font-medium text-amber-900 mb-2">Use loyalty points</h3>
                <p className="text-sm text-amber-800 mb-2">
                  You have <strong>{loyaltyData.balance} points</strong> ({loyaltyData.tier} tier).
                  {loyaltyData.maxRedeemable != null && loyaltyData.maxRedeemable > 0 && (
                    <> Use up to <strong>{loyaltyData.maxRedeemable} points</strong> for this booking (100 points = ${(loyaltyData.redemptionCentsPer100Points / 100).toFixed(2)} off).</>
                  )}
                </p>
                {loyaltyData.maxRedeemable != null && loyaltyData.maxRedeemable > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-sm text-amber-800">Points to use:</label>
                    <input
                      type="number"
                      min={0}
                      max={loyaltyData.maxRedeemable}
                      step={100}
                      value={loyaltyPointsToRedeem || ''}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (Number.isNaN(v)) setLoyaltyPointsToRedeem(0)
                        else setLoyaltyPointsToRedeem(Math.max(0, Math.min(v, loyaltyData.maxRedeemable ?? 0)))
                      }}
                    className="w-full sm:w-24 rounded border border-amber-300 px-2 py-1 text-sm"
                    />
                    {loyaltyPointsToRedeem >= loyaltyData.minRedemptionPoints && (
                      <span className="text-sm text-green-700">
                        Discount: ${((loyaltyPointsToRedeem / 100) * (loyaltyData.redemptionCentsPer100Points / 100)).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

              </div>

              {/* Right column: Booking summary — step 4; column stretches so sticky follows scroll */}
              <div className="hidden lg:block lg:self-stretch">
                <BookingSummary
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  durationMinutes={duration}
                  numBowlers={numBowlers}
                  numLanes={numLanes}
                  numShoeRentals={numShoeRentals}
                  numOwnShoes={numOwnShoes}
                  packages={selectedPackagesData}
                  productLineItems={productLineItems}
                  breakdown={step2Breakdown}
                  isPartyEvent={isPartyEvent}
                  partyType={partyType}
                  variant="sidebar"
                />
              </div>
            </div>

            {/* Footer CTAs — outside cards (Figma 117-1339). No Back when guest is selected. */}
            <BookingStepActions>
              {isAuthenticated === false && checkoutMode === 'guest' ? (
                <span aria-hidden />
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (paymentClientSecret) {
                      handlePaymentCancel()
                    } else {
                      setStep(3)
                      setCheckoutMode(null)
                    }
                  }}
                  className={`${STEP_NAV_BUTTON} !bg-white !text-[#6366F1] !border !border-[#6366F1]/30 hover:!bg-[#F8FAFF]`}
                >
                  Back
                </Button>
              )}
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {!paymentClientSecret && isAuthenticated === false && checkoutMode !== null && (
                  <Button variant="secondary" onClick={() => setCheckoutMode(null)} className={STEP_NAV_BUTTON}>
                    Back to options
                  </Button>
                )}
                {!paymentClientSecret && isAuthenticated === true && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        I agree to the{' '}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          terms and conditions
                        </a>
                      </span>
                    </label>
                    <Button
                      onClick={handleSubmit}
                      isLoading={loading}
                      disabled={!canSubmitBooking}
                      className={STEP_NAV_BUTTON}
                    >
                      Complete Booking
                    </Button>
                  </>
                )}
              </div>
            </BookingStepActions>
          </BookingStepLayout>
          ); })()}
      </div>

      {/* Package Detail Panel */}
      <PackageDetailPanel
        package={packages.find(p => p.id === detailPanelPackageId) || null}
        isOpen={detailPanelPackageId !== null}
        onClose={() => setDetailPanelPackageId(null)}
        onAddToCart={handleAddPackageToCart}
      />
    </main>
  )
}
