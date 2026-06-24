export type Lang = 'es' | 'en'

const translations = {
  es: {
    // Navigation
    dashboard:      'Dashboard',
    simulations:    'Simulaciones',
    certification:  'Certificación',
    conversational: 'Conversacional',
    coaching:       'Coaching',
    leaderboard:    'Ranking',
    activities:     'Actividades',
    organization:   'Organización',
    reports:        'Reportes',
    settings:       'Configuración',

    // KPIs
    totalSimulations: 'Total Simulaciones',
    averageScore:     'Promedio de Puntaje',
    passRate:         'Tasa de Aprobación',
    activeAdvisors:   'Asesores Activos',
    passCount:        'Aprobados',
    failCount:        'Reprobados',
    bestScore:        'Mejor Puntaje',
    worstScore:       'Menor Puntaje',
    totalActivities:  'Total Actividades',
    totalMembers:     'Total Miembros',

    // Chart labels
    trend:             'Tendencia',
    scoreDistribution: 'Distribución de Puntajes',
    passFailRatio:     'Aprobados vs Reprobados',
    roundAnalysis:     'Análisis por Interacción',
    activityBreakdown: 'Desglose por Actividad',
    topPerformers:     'Mejores Desempeños',

    // Filters
    dateFrom:    'Desde',
    dateTo:      'Hasta',
    applyFilter: 'Aplicar',
    resetFilter: 'Limpiar',
    today:       'Hoy',
    lastWeek:    'Últ. 7 días',
    lastMonth:   'Últ. 30 días',
    last3Months: 'Últ. 3 meses',
    allTime:     'Todo',

    // Table headers
    name:     'Nombre',
    email:    'Email',
    score:    'Puntaje',
    result:   'Resultado',
    date:     'Fecha',
    activity: 'Actividad',
    attempts: 'Intentos',
    rank:     'Puesto',
    level:    'Nivel',

    // Status
    pass:          'Aprobado',
    fail:          'Reprobado',
    certified:     'Certificado',
    notCertified:  'No certificado',
    active:        'Activo',
    inactive:      'Inactivo',

    // Actions
    export:      'Exportar',
    download:    'Descargar',
    search:      'Buscar',
    filter:      'Filtrar',
    close:       'Cerrar',
    back:        'Volver',
    viewDetails: 'Ver detalles',
    refresh:     'Actualizar',

    // Messages
    noData:         'Sin datos disponibles',
    loading:        'Cargando...',
    error:          'Error al cargar los datos',
    noSimulations:  'No hay simulaciones aún',
    noMembers:      'No hay miembros registrados',
    noActivities:   'No hay actividades disponibles',

    // AI
    aiAssistant:  'Asistente IA SIIGO',
    askQuestion:  'Hacer una pregunta',
    typeMessage:  'Escribe tu pregunta...',
    aiPlaceholder:'¿Cuántas simulaciones hubo ayer? ¿Quiénes son los mejores asesores?',
    aiError:      'Error al consultar el asistente IA',
    aiLoading:    'Analizando...',

    // Months
    enero: 'Enero', febrero: 'Febrero', marzo: 'Marzo', abril: 'Abril',
    mayo: 'Mayo', junio: 'Junio', julio: 'Julio', agosto: 'Agosto',
    septiembre: 'Septiembre', octubre: 'Octubre', noviembre: 'Noviembre', diciembre: 'Diciembre',

    // Days
    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',

    // Overview page
    welcomeTitle:        'Bienvenido al Dashboard',
    scoreTrend:          'Tendencia de Puntajes',
    daily:               'Diario',
    approvalVsDisapproval:'Aprobados vs. Reprobados',
    approved:            'Aprobados',
    disapproved:         'Reprobados',
    aiInsights:          'Insights IA',
    viewAllActivities:   'Ver todas las actividades',
    viewAll:             'Ver todo',
    viewRecommendation:  'Ver recomendación',
    exportAll:           'Exportar Todo',
    advisors:            'Asesores',
    vsLastMonth:         'vs mes anterior',
    totalLabel:          'Total',
    recommendation:      'Recomendación',
    businessLines:       'Líneas de Negocio',
    showingDataFrom:     'Mostrando datos del',
    showingDataTo:       'al',
    simulationsWord:     'simulaciones',
    teamCompletedPre:    'Tu equipo ha completado',
    teamCompletedPost:   'simulaciones en este periodo.',

    // Empty states
    noDataPeriod:        'No se encontró actividad para el período seleccionado.',
    noDataAnalysis:      'No hay suficientes datos disponibles para este análisis.',
    waitingInsights:     'Esperando más interacciones antes de generar información.',
    noDataAvailable:     'Sin datos disponibles para este período.',

    // Sidebar sections
    sectionGeneral:   'VISTA GENERAL',
    sectionSimulator: 'SIMULADOR',
    sectionPlatform:  'PLATAFORMA',
    sectionMore:      'MÁS',

    // Misc
    siigo:           'SIIGO',
    salesDashboard:  'Dashboard de Ventas',
    trainingPlatform:'Plataforma de Entrenamiento',
    exportCsv:       'Exportar CSV',
    exportPdf:       'Exportar PDF',
    pageOf:          'de',
    showing:         'Mostrando',
    results:         'resultados',
    admin:           'Administrador',
    analyticsTitle:  'Plataforma Analítica SIIGO',

    // Reports page
    format:              'Formato',
    generating:          'Generando...',
    generateAndDownload: 'Generar y Descargar',
    comingSoon:          'Disponible próximamente',
    soon:                'Pronto',
    pdfSoon:             'PDF (próximamente)',
    customExportNote:    'La exportación personalizada incluye el detalle completo de simulaciones filtrado por el rango de fechas seleccionado. El filtro de asesor y actividad del panel principal también se aplica.',
    emailReports:        'Reportes por Email',
    emailReportsDesc:    'Recibe un resumen automático semanal directamente en tu bandeja de entrada.',
    powerBIInt:          'Integración PowerBI',
    powerBIDesc:         'Conecta el dashboard directamente con tus reportes de PowerBI via API.',
    weeklyDigest:        'Resumen Semanal',
    weeklyDigestDesc:    'Email automático cada lunes con el rendimiento del equipo de la semana anterior.',

    // Simulation report modal
    simulationReport:    'Reporte de Simulación',
    sessionInfo:         'Información de la Sesión',
    advisorLabel:        'Asesor',
    sessionId:           'ID Sesión',
    interactionDetails:  'Detalle de Interacciones',
    noInteractionDetail: 'Sin detalle de interacciones disponible.',
    interaction:         'Interacción',
    aiQuestion:          'Pregunta AI',
    advisorResponse:     'Respuesta del Asesor',
    feedbackLabel:       'Retroalimentación',
    closingAnalysis:     'Análisis de Cierre',
    generatingPdf:       'Generando PDF...',
    downloadPdf:         'Descargar PDF',

    // Business Lines page
    businessLinesTitle:  'Líneas de Negocio',
    businessLinesSub:    'Rendimiento segmentado por línea de producto y unidad de negocio',
    certificationNav:    'Certificación',
    certificationSub:    'Seguimiento de certificación de asesores',

    // Toast messages
    summaryDownloaded:   'Resumen ejecutivo descargado correctamente.',
    simsDownloaded:      'Detalle de simulaciones descargado correctamente.',
    leaderDownloaded:    'Ranking de asesores descargado correctamente.',
    certDownloaded:      'Reporte de certificación descargado correctamente.',
    exportError:         'Error al generar el archivo.',
    selectDateRange:     'Selecciona un rango de fechas válido.',
    dateRangeError:      'La fecha de inicio no puede ser posterior a la fecha de fin.',
  },
  en: {
    dashboard:      'Dashboard',
    simulations:    'Simulations',
    certification:  'Certification',
    conversational: 'Conversational',
    coaching:       'Coaching',
    leaderboard:    'Leaderboard',
    activities:     'Activities',
    organization:   'Organization',
    reports:        'Reports',
    settings:       'Settings',

    totalSimulations: 'Total Simulations',
    averageScore:     'Average Score',
    passRate:         'Pass Rate',
    activeAdvisors:   'Active Advisors',
    passCount:        'Passed',
    failCount:        'Failed',
    bestScore:        'Best Score',
    worstScore:       'Worst Score',
    totalActivities:  'Total Activities',
    totalMembers:     'Total Members',

    trend:             'Trend',
    scoreDistribution: 'Score Distribution',
    passFailRatio:     'Pass vs Fail',
    roundAnalysis:     'Round Analysis',
    activityBreakdown: 'Activity Breakdown',
    topPerformers:     'Top Performers',

    dateFrom:    'From',
    dateTo:      'To',
    applyFilter: 'Apply',
    resetFilter: 'Clear',
    today:       'Today',
    lastWeek:    'Last 7 days',
    lastMonth:   'Last 30 days',
    last3Months: 'Last 3 months',
    allTime:     'All time',

    name:     'Name',
    email:    'Email',
    score:    'Score',
    result:   'Result',
    date:     'Date',
    activity: 'Activity',
    attempts: 'Attempts',
    rank:     'Rank',
    level:    'Level',

    pass:          'Passed',
    fail:          'Failed',
    certified:     'Certified',
    notCertified:  'Not certified',
    active:        'Active',
    inactive:      'Inactive',

    export:      'Export',
    download:    'Download',
    search:      'Search',
    filter:      'Filter',
    close:       'Close',
    back:        'Back',
    viewDetails: 'View details',
    refresh:     'Refresh',

    noData:         'No data available',
    loading:        'Loading...',
    error:          'Error loading data',
    noSimulations:  'No simulations yet',
    noMembers:      'No members registered',
    noActivities:   'No activities available',

    aiAssistant:  'SIIGO AI Assistant',
    askQuestion:  'Ask a question',
    typeMessage:  'Type your question...',
    aiPlaceholder:'How many simulations yesterday? Who are the top advisors?',
    aiError:      'Error querying the AI assistant',
    aiLoading:    'Analyzing...',

    enero: 'January', febrero: 'February', marzo: 'March', abril: 'April',
    mayo: 'May', junio: 'June', julio: 'July', agosto: 'August',
    septiembre: 'September', octubre: 'October', noviembre: 'November', diciembre: 'December',

    lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday',
    jueves: 'Thursday', viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday',

    // Overview page
    welcomeTitle:        'Welcome to the Dashboard',
    scoreTrend:          'Score Trend',
    daily:               'Daily',
    approvalVsDisapproval:'Approval vs. Disapproval',
    approved:            'Approved',
    disapproved:         'Disapproved',
    aiInsights:          'AI Insights',
    viewAllActivities:   'View all activities',
    viewAll:             'View all',
    viewRecommendation:  'View recommendation',
    exportAll:           'Export All',
    advisors:            'Advisors',
    vsLastMonth:         'vs last month',
    totalLabel:          'Total',
    recommendation:      'Recommendation',
    businessLines:       'Business Lines',
    showingDataFrom:     'Showing data from',
    showingDataTo:       'to',
    simulationsWord:     'simulations',
    teamCompletedPre:    'Your team has completed',
    teamCompletedPost:   'simulations in this period.',

    // Empty states
    noDataPeriod:        'No activity found for the selected period.',
    noDataAnalysis:      'Not enough data available for this analysis.',
    waitingInsights:     'Waiting for more interactions before generating insights.',
    noDataAvailable:     'No data available for this period.',

    // Sidebar sections
    sectionGeneral:   'GENERAL VIEW',
    sectionSimulator: 'SIMULATOR',
    sectionPlatform:  'PLATFORM',
    sectionMore:      'MORE',

    // Misc
    siigo:           'SIIGO',
    salesDashboard:  'Sales Dashboard',
    trainingPlatform:'Training Platform',
    exportCsv:       'Export CSV',
    exportPdf:       'Export PDF',
    pageOf:          'of',
    showing:         'Showing',
    results:         'results',
    admin:           'Administrator',
    analyticsTitle:  'SIIGO Analytics Platform',

    // Reports page
    format:              'Format',
    generating:          'Generating...',
    generateAndDownload: 'Generate & Download',
    comingSoon:          'Coming soon',
    soon:                'Soon',
    pdfSoon:             'PDF (coming soon)',
    customExportNote:    'The custom export includes the full simulation detail filtered by the selected date range. The advisor and activity filters from the main panel also apply.',
    emailReports:        'Email Reports',
    emailReportsDesc:    'Receive an automatic weekly summary directly in your inbox.',
    powerBIInt:          'PowerBI Integration',
    powerBIDesc:         'Connect the dashboard directly to your PowerBI reports via API.',
    weeklyDigest:        'Weekly Digest',
    weeklyDigestDesc:    'Automatic email every Monday with the previous week\'s team performance.',

    // Simulation report modal
    simulationReport:    'Simulation Report',
    sessionInfo:         'Session Info',
    advisorLabel:        'Advisor',
    sessionId:           'Session ID',
    interactionDetails:  'Interaction Details',
    noInteractionDetail: 'No interaction detail available.',
    interaction:         'Interaction',
    aiQuestion:          'AI Question',
    advisorResponse:     'Advisor Response',
    feedbackLabel:       'Feedback',
    closingAnalysis:     'Closing Analysis',
    generatingPdf:       'Generating PDF...',
    downloadPdf:         'Download PDF',

    // Business Lines page
    businessLinesTitle:  'Business Lines',
    businessLinesSub:    'Performance segmented by product line and business unit',
    certificationNav:    'Certification',
    certificationSub:    'Advisor certification tracking',

    // Toast messages
    summaryDownloaded:   'Executive summary downloaded.',
    simsDownloaded:      'Simulation detail downloaded.',
    leaderDownloaded:    'Advisor ranking downloaded.',
    certDownloaded:      'Certification report downloaded.',
    exportError:         'Error generating the file.',
    selectDateRange:     'Please select a valid date range.',
    dateRangeError:      'Start date cannot be after end date.',
  },
} as const

type TranslationKey = keyof typeof translations.es

export function t(key: string, lang: Lang = 'es'): string {
  const dict = translations[lang] as Record<string, string>
  return dict[key] ?? translations.es[key as TranslationKey] ?? key
}

export default t
