"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowLeftRight, TrendingDown, Download, Loader2, CheckCircle2, AlertTriangle, X, Filter } from "lucide-react";
import { 
  getCajaActual, 
  getCajaHistorial,
  moverDinero,
  registrarGasto,
  type CuentaCaja, 
  type MovimientoCaja,
  type ExpenseCategory
} from "@/app/actions/caja";

// Categorías de gastos
const CATEGORIAS_GASTO = [
  { value: "FOOD", label: "Comida" },
  { value: "MOBILITY", label: "Transporte" },
  { value: "SHOPPING", label: "Compras" },
  { value: "ERRANDS", label: "Encargos" },
  { value: "MERCHANDISE", label: "Mercadería" },
  { value: "HEALTH", label: "Salud" },
  { value: "EDUCATION", label: "Educación" },
  { value: "ENTERTAINMENT", label: "Entretenimiento" },
  { value: "UTILITIES", label: "Servicios" },
  { value: "PAYROLL", label: "Pago a personal" },
  { value: "OTHER", label: "Otros" },
];

function CajaPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const juntaId = searchParams.get("id");

  const [activeTab, setActiveTab] = useState<"actual" | "historial">("actual");
  const [cuentas, setCuentas] = useState<CuentaCaja[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de modales
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Estados de transferencia
  const [transferForm, setTransferForm] = useState({
    cuentaOrigenId: "",
    cuentaDestinoId: "",
    monto: "",
    descripcion: "",
    notas: ""
  });
  const [transferLoading, setTransferLoading] = useState(false);

  // Estados de gasto
  const [expenseForm, setExpenseForm] = useState({
    cuentaId: "",
    monto: "",
    descripcion: "",
    beneficiario: "",
    categoria: "",
    notas: ""
  });
  const [expenseLoading, setExpenseLoading] = useState(false);

  // Estados de alerta
  const [alert, setAlert] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  }>({ show: false, type: "info", title: "", message: "" });

  // Filtros de historial
  const [filters, setFilters] = useState({
    tipo: "",
    fechaDesde: "",
    fechaHasta: "",
    busqueda: ""
  });

  const loadCajaData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "actual") {
        const data = await getCajaActual();
        setCuentas(data);
      } else {
        const data = await getCajaHistorial(juntaId!);
        setMovimientos(data);
      }
    } catch (error) {
      console.error("Error cargando datos de caja:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, juntaId]);

  useEffect(() => {
    if (juntaId) {
      loadCajaData();
    }
  }, [juntaId, activeTab, loadCajaData]);

  const showAlert = (type: "success" | "error" | "info", title: string, message: string) => {
    setAlert({ show: true, type, title, message });
    setTimeout(() => setAlert({ show: false, type: "info", title: "", message: "" }), 3000);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferForm.cuentaOrigenId || !transferForm.cuentaDestinoId || !transferForm.monto || !transferForm.descripcion) {
      showAlert("error", "Error", "Por favor completa todos los campos obligatorios");
      return;
    }

    if (transferForm.cuentaOrigenId === transferForm.cuentaDestinoId) {
      showAlert("error", "Error", "No puedes transferir a la misma cuenta");
      return;
    }

    setTransferLoading(true);
    try {
      const result = await moverDinero(
        transferForm.cuentaOrigenId,
        transferForm.cuentaDestinoId,
        parseFloat(transferForm.monto),
        transferForm.descripcion,
        transferForm.notas || undefined
      );

      if (result.success) {
        showAlert("success", "¡Éxito!", result.message);
        setShowTransferModal(false);
        setTransferForm({
          cuentaOrigenId: "",
          cuentaDestinoId: "",
          monto: "",
          descripcion: "",
          notas: ""
        });
        await loadCajaData();
      } else {
        showAlert("error", "Error", result.message);
      }
    } catch (error) {
      console.error("Error en transferencia:", error);
      showAlert("error", "Error", "Error al realizar la transferencia");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseForm.cuentaId || !expenseForm.monto || !expenseForm.descripcion) {
      showAlert("error", "Error", "Por favor completa todos los campos obligatorios");
      return;
    }

    setExpenseLoading(true);
    try {
      const result = await registrarGasto(
        expenseForm.cuentaId,
        parseFloat(expenseForm.monto),
        expenseForm.descripcion,
        expenseForm.beneficiario || undefined,
        expenseForm.categoria as ExpenseCategory | undefined,
        expenseForm.notas || undefined
      );

      if (result.success) {
        showAlert("success", "¡Éxito!", result.message);
        setShowExpenseModal(false);
        setExpenseForm({
          cuentaId: "",
          monto: "",
          descripcion: "",
          beneficiario: "",
          categoria: "",
          notas: ""
        });
        await loadCajaData();
      } else {
        showAlert("error", "Error", result.message);
      }
    } catch (error) {
      console.error("Error en gasto:", error);
      showAlert("error", "Error", "Error al registrar el gasto");
    } finally {
      setExpenseLoading(false);
    }
  };

  const totalCaja = cuentas.reduce((sum, c) => sum + Number(c.saldo), 0);

  const getCuentaIcon = (tipo: string) => {
    if (tipo.startsWith("YAPE")) return "📱";
    if (tipo.startsWith("TRANSFERENCIA")) return "🏦";
    if (tipo === "EFECTIVO") return "💵";
    return "💰";
  };

  const getCuentaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      YAPE_SEBASTIAN: "Yape Sebastian",
      YAPE_PILAR: "Yape Pilar",
      YAPE_STHEFANY: "Yape Sthefany",
      TRANSFERENCIA_SEBASTIAN: "Transferencia Sebastian",
      TRANSFERENCIA_STHEFANY: "Transferencia Sthefany",
      EFECTIVO: "Efectivo"
    };
    return labels[tipo] || tipo;
  };

  // Filtrar movimientos según los filtros aplicados
  const movimientosFiltrados = movimientos.filter((mov) => {
    if (filters.tipo && mov.tipo !== filters.tipo) return false;
    if (filters.busqueda) {
      const busqueda = filters.busqueda.toLowerCase();
      const matchDesc = mov.descripcion.toLowerCase().includes(busqueda);
      const matchBenef = mov.beneficiario?.toLowerCase().includes(busqueda);
      if (!matchDesc && !matchBenef) return false;
    }
    if (filters.fechaDesde) {
      const fecha = new Date(mov.fecha);
      const desde = new Date(filters.fechaDesde);
      if (fecha < desde) return false;
    }
    if (filters.fechaHasta) {
      const fecha = new Date(mov.fecha);
      const hasta = new Date(filters.fechaHasta);
      if (fecha > hasta) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/junta?id=${juntaId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">💰 Gestión de Caja</h1>
            <p className="text-gray-600">Control de cuentas y movimientos</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTransferModal(true)}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transferir
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowExpenseModal(true)}
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Registrar Gasto
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("actual")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "actual"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Estado Actual
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "historial"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Historial
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Cargando datos...</p>
        </div>
      ) : activeTab === "actual" ? (
        <div>
          {/* Alertas de Saldo Bajo */}
          {cuentas.filter((c) => Number(c.saldo) < Number(c.umbralAlerta)).length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-amber-900">⚠️ Alertas de Saldo Bajo</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Las siguientes cuentas tienen saldo por debajo del umbral de alerta:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {cuentas
                      .filter((c) => Number(c.saldo) < Number(c.umbralAlerta))
                      .map((cuenta) => (
                        <li key={cuenta.id} className="text-sm text-amber-800">
                          • <strong>{getCuentaLabel(cuenta.tipoCuenta)}</strong>: S/ {cuenta.saldo.toFixed(2)}{" "}
                          (umbral: S/ {cuenta.umbralAlerta.toFixed(2)})
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Total General */}
          <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardHeader>
              <CardTitle className="text-white">Total en Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">S/ {totalCaja.toFixed(2)}</p>
              <p className="text-blue-100 mt-2">
                Distribuido en {cuentas.length} cuentas
              </p>
            </CardContent>
          </Card>

          {/* Cuentas Individuales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cuentas.map((cuenta) => (
              <Card key={cuenta.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getCuentaIcon(cuenta.tipoCuenta)}</span>
                    <CardTitle className="text-lg">
                      {getCuentaLabel(cuenta.tipoCuenta)}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    S/ {Number(cuenta.saldo).toFixed(2)}
                  </p>
                  {Number(cuenta.saldo) < Number(cuenta.umbralAlerta) && (
                    <div className="mt-2 px-2 py-1 bg-amber-100 text-amber-800 text-sm rounded">
                      ⚠️ Saldo bajo
                    </div>
                  )}
                  {cuenta.notas && (
                    <p className="text-sm text-gray-600 mt-2">{cuenta.notas}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {/* Historial de Movimientos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historial de Movimientos</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterModal(!showFilterModal)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </CardHeader>
            <CardContent>
              {/* Panel de Filtros */}
              {showFilterModal && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo de Movimiento</Label>
                      <select
                        value={filters.tipo}
                        onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos</option>
                        <option value="INGRESO">Ingresos</option>
                        <option value="EGRESO">Egresos</option>
                        <option value="TRANSFERENCIA">Transferencias</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Buscar</Label>
                      <Input
                        placeholder="Descripción o beneficiario..."
                        value={filters.busqueda}
                        onChange={(e) => setFilters({ ...filters, busqueda: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Desde</Label>
                      <Input
                        type="date"
                        value={filters.fechaDesde}
                        onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Hasta</Label>
                      <Input
                        type="date"
                        value={filters.fechaHasta}
                        onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ tipo: "", fechaDesde: "", fechaHasta: "", busqueda: "" })}
                    className="w-full"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              )}

              {movimientosFiltrados.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {movimientos.length === 0
                    ? "No hay movimientos registrados"
                    : "No se encontraron movimientos con estos filtros"}
                </p>
              ) : (
                <div className="space-y-4">
                  {movimientosFiltrados.map((mov) => (
                    <div
                      key={mov.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">
                              {mov.tipo === "INGRESO" && "📥"}
                              {mov.tipo === "EGRESO" && "📤"}
                              {mov.tipo === "TRANSFERENCIA" && "🔄"}
                            </span>
                            <span className="font-semibold">{mov.descripcion}</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {new Date(mov.fecha).toLocaleDateString("es-PE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                          {mov.beneficiario && (
                            <p className="text-sm text-gray-600">
                              Beneficiario: {mov.beneficiario}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xl font-bold ${
                              mov.tipo === "INGRESO"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {mov.tipo === "INGRESO" ? "+" : "-"}S/ {Number(mov.monto).toFixed(2)}
                          </p>
                          {mov.cuentaOrigenNombre && (
                            <p className="text-xs text-gray-500">
                              De: {mov.cuentaOrigenNombre}
                            </p>
                          )}
                          {mov.cuentaDestinoNombre && (
                            <p className="text-xs text-gray-500">
                              A: {mov.cuentaDestinoNombre}
                            </p>
                          )}
                        </div>
                      </div>
                      {mov.notas && (
                        <p className="text-sm text-gray-500 mt-2">📝 {mov.notas}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      {/* Modal de Transferencia */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-blue-600" />
                Transferir entre Cuentas
              </CardTitle>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cuentaOrigen">Cuenta Origen *</Label>
                  <select
                    id="cuentaOrigen"
                    value={transferForm.cuentaOrigenId}
                    onChange={(e) => setTransferForm({ ...transferForm, cuentaOrigenId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {getCuentaLabel(cuenta.tipoCuenta)} - S/ {cuenta.saldo.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cuentaDestino">Cuenta Destino *</Label>
                  <select
                    id="cuentaDestino"
                    value={transferForm.cuentaDestinoId}
                    onChange={(e) => setTransferForm({ ...transferForm, cuentaDestinoId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas
                      .filter((c) => c.id !== transferForm.cuentaOrigenId)
                      .map((cuenta) => (
                        <option key={cuenta.id} value={cuenta.id}>
                          {getCuentaLabel(cuenta.tipoCuenta)} - S/ {cuenta.saldo.toFixed(2)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoTransfer">Monto (S/) *</Label>
                  <Input
                    id="montoTransfer"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferForm.monto}
                    onChange={(e) => setTransferForm({ ...transferForm, monto: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcionTransfer">Descripción *</Label>
                  <Input
                    id="descripcionTransfer"
                    value={transferForm.descripcion}
                    onChange={(e) => setTransferForm({ ...transferForm, descripcion: e.target.value })}
                    placeholder="Ej: Consolidación de fondos"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notasTransfer">Notas (opcional)</Label>
                  <textarea
                    id="notasTransfer"
                    value={transferForm.notas}
                    onChange={(e) => setTransferForm({ ...transferForm, notas: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Información adicional..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1"
                    disabled={transferLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={transferLoading}
                  >
                    {transferLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Transfiriendo...
                      </>
                    ) : (
                      <>
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Transferir
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Gastos */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Registrar Gasto
              </CardTitle>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cuentaGasto">Cuenta a Descontar *</Label>
                  <select
                    id="cuentaGasto"
                    value={expenseForm.cuentaId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, cuentaId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Selecciona una cuenta</option>
                    {cuentas.map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {getCuentaLabel(cuenta.tipoCuenta)} - S/ {cuenta.saldo.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montoGasto">Monto (S/) *</Label>
                  <Input
                    id="montoGasto"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={expenseForm.monto}
                    onChange={(e) => setExpenseForm({ ...expenseForm, monto: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcionGasto">Descripción *</Label>
                  <Input
                    id="descripcionGasto"
                    value={expenseForm.descripcion}
                    onChange={(e) => setExpenseForm({ ...expenseForm, descripcion: e.target.value })}
                    placeholder="Ej: Pago a beneficiario"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficiario">Beneficiario (opcional)</Label>
                  <Input
                    id="beneficiario"
                    value={expenseForm.beneficiario}
                    onChange={(e) => setExpenseForm({ ...expenseForm, beneficiario: e.target.value })}
                    placeholder="Nombre de quien recibe el dinero"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría (opcional)</Label>
                  <select
                    id="categoria"
                    value={expenseForm.categoria}
                    onChange={(e) => setExpenseForm({ ...expenseForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Sin categoría</option>
                    {CATEGORIAS_GASTO.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notasGasto">Notas (opcional)</Label>
                  <textarea
                    id="notasGasto"
                    value={expenseForm.notas}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notas: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                    placeholder="Información adicional..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1"
                    disabled={expenseLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={expenseLoading}
                  >
                    {expenseLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Registrar Gasto
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert/Notification */}
      {alert.show && (
        <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-top duration-300">
          <div
            className={`bg-white rounded-lg shadow-2xl p-4 min-w-[300px] max-w-md border-l-4 ${
              alert.type === "success"
                ? "border-green-500"
                : alert.type === "error"
                ? "border-red-500"
                : "border-blue-500"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full ${
                  alert.type === "success"
                    ? "bg-green-100"
                    : alert.type === "error"
                    ? "bg-red-100"
                    : "bg-blue-100"
                }`}
              >
                {alert.type === "success" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {alert.type === "error" && <AlertTriangle className="h-5 w-5 text-red-600" />}
                {alert.type === "info" && <AlertTriangle className="h-5 w-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{alert.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CajaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando datos...</p>
          </div>
        </div>
      }
    >
      <CajaPageInner />
    </Suspense>
  );
}
