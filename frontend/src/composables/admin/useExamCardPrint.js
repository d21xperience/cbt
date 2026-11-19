// src/composables/admin/useExamCardPrint.js
import { ref } from 'vue'
import QRCode from 'qrcode'
import { ExamCardService } from '@/services/admin/ExamCardService'
import {
  buildCardPdfDefinition,
  buildQrUrl,
  buildSignatureQrUrl,
  downloadCardPdf,
  openCardPdf,
} from '@/utils/pdf/cardTemplatePdf'

export function useExamCardPrint() {
  const generating = ref(false)

  const generateQrDataUrl = async (text, size = 220) => {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  }

  const prepareCardsWithQr = async (cards, tenant) => {
    const out = []
    for (const c of cards) {
      const loginUrl = buildQrUrl(tenant, c.qr_token)
      const sigUrl = buildSignatureQrUrl(tenant, c.card_number, c.signature_qr_token || '')
      const [qrDataUrl, signatureQrDataUrl] = await Promise.all([
        generateQrDataUrl(loginUrl, 220),
        generateQrDataUrl(sigUrl, 120),
      ])
      out.push({ ...c, qrDataUrl, signatureQrDataUrl, qrUrl: loginUrl, sigUrl })
    }
    return out
  }

  // ✅ PERBAIKAN: Tambah parameter examMode
  const printCards = async ({ cards, school, tenant, exams = [], examMode = 'UJIAN', settings = {}, mode = 'open' }) => {
    if (!cards || cards.length === 0) return
    generating.value = true
    try {
      const enriched = await prepareCardsWithQr(cards, tenant)
      const def = buildCardPdfDefinition({
        cards: enriched,
        school,
        tenant,
        exams,
        examMode,
        settings, // ✅ Diteruskan ke template
      })
      if (mode === 'download') {
        downloadCardPdf(def, `kartu-ujian-${tenant}-${Date.now()}.pdf`)
      } else {
        openCardPdf(def)
      }
      Promise.allSettled(cards.map((c) => ExamCardService.markPrinted(c.id)))
    } finally {
      generating.value = false
    }
  }

  return { generating, printCards, prepareCardsWithQr, generateQrDataUrl }
}
