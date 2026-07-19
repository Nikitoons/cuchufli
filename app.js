/**
 * Cuchuflí Pro - Application Logic & State Management
 */

// 1. Initial / Default State ( Chilean Cuchuflí Business Context )
const DEFAULT_STATE = {
    ingredients: [
        { id: "ing-1", name: "Manjar Colun (Bolsa 1kg)", category: "Ingrediente", unit: "gr", price: 3800, size: 1000 },
        { id: "ing-2", name: "Tubos / Barquillos de Cuchuflí", category: "Ingrediente", unit: "un", price: 2000, size: 100 },
        { id: "ing-3", name: "Cobertura de Chocolate Negro (Sabor)", category: "Ingrediente", unit: "gr", price: 4500, size: 1000 },
        { id: "ing-4", name: "Bolsitas plásticas para Cuchuflí (100 un)", category: "Envoltura", unit: "un", price: 1200, size: 100 },
        { id: "ing-5", name: "Cinta decorativa adhesiva / Amarras (100 un)", category: "Decoración", unit: "un", price: 800, size: 100 },
        { id: "ing-6", name: "Galletas Oreo (Paquete 12 un)", category: "Ingrediente", unit: "un", price: 1200, size: 12 }
    ],
    recipes: [
        {
            id: "rec-1",
            name: "Cuchuflí Clásico de Manjar",
            yield: 120,
            ingredients: [
                { id: "ing-1", quantity: 1200 }, // 1200g manjar = $4560
                { id: "ing-2", quantity: 120 },  // 120 wafers = $2400
                { id: "ing-4", quantity: 120 },  // 120 bags = $1440
                { id: "ing-5", quantity: 120 }   // 120 ribbons = $960
            ], // Total Cost = $9360. Unit Cost = $78 CLP.
            formats: [
                { cuchuflisPerBag: 4, bagsCount: 25, sellingPrice: 1000 },
                { cuchuflisPerBag: 5, bagsCount: 4, sellingPrice: 1000 }
            ],
            sellingPrice: 250
        },
        {
            id: "rec-2",
            name: "Cuchuflí Bañado en Chocolate",
            yield: 50,
            ingredients: [
                { id: "ing-1", quantity: 500 }, // 500g manjar = $1900
                { id: "ing-2", quantity: 50 },  // 50 wafers = $1000
                { id: "ing-3", quantity: 200 }, // 200g chocolate = $900
                { id: "ing-4", quantity: 50 },  // 50 bags = $600
                { id: "ing-5", quantity: 50 }   // 50 ribbons = $400
            ], // Total Cost = $4800. Unit Cost = $96 CLP.
            formats: [
                { cuchuflisPerBag: 4, bagsCount: 12, sellingPrice: 1500 }
            ],
            sellingPrice: 400
        }
    ],
    transactions: [
        { id: "tx-1", type: "sale", recipeId: "rec-1", recipeName: "Cuchuflí Clásico de Manjar", quantity: 40, unitPrice: 250, totalAmount: 10000, estimatedCost: 3120, estimatedProfit: 6880, date: getPastDateString(3), notes: "Venta almacén de la esquina" },
        { id: "tx-2", type: "expense", description: "Gas recarga de 15kg", category: "Servicios", amount: 23500, date: getPastDateString(2) },
        { id: "tx-4", type: "purchase", ingredientId: "ing-1", ingredientName: "Manjar Colun (Bolsa 1kg)", quantity: 2, pricePerPackage: 3800, amount: 7600, date: getPastDateString(2), notes: "Boleta Supermercado #9948" },
        { id: "tx-3", type: "sale", recipeId: "rec-2", recipeName: "Cuchuflí Bañado en Chocolate", quantity: 30, unitPrice: 400, totalAmount: 12000, estimatedCost: 2880, estimatedProfit: 9120, date: getPastDateString(1), notes: "Pedido cumpleaños infantil" }
    ],
    theme: "light"
};

// State helper to generate dates for mock data
function getPastDateString(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
}

// 2. Application State Holder
let appState = {};

// Current builder recipe state
let currentRecipeIngredients = []; // array of { id, quantity }
let currentRecipeFormats = []; // array of { cuchuflisPerBag, bagsCount, sellingPrice }

// Load state from local storage or set default
function initAppState() {
    const saved = localStorage.getItem("cuchufli_pro_state");
    if (saved) {
        try {
            appState = JSON.parse(saved);
            // Verify structure
            if (!appState.ingredients || !appState.recipes || !appState.transactions) {
                appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
            } else {
                // Ensure Oreo cookies ingredient exists for all users
                const hasOreo = appState.ingredients.some(ing => ing.name.toLowerCase().includes("oreo"));
                if (!hasOreo) {
                    appState.ingredients.push({
                        id: "ing-6",
                        name: "Galletas Oreo (Paquete 12 un)",
                        category: "Ingrediente",
                        unit: "un",
                        price: 1200,
                        size: 12
                    });
                }
                
                // Ensure all loaded recipes have a formats list
                appState.recipes.forEach(rec => {
                    if (!rec.formats) {
                        rec.formats = [];
                        if (rec.cuchuflisPerBag) {
                            const bags = Math.floor(rec.yield / rec.cuchuflisPerBag);
                            if (bags > 0) {
                                rec.formats.push({
                                    cuchuflisPerBag: rec.cuchuflisPerBag,
                                    bagsCount: bags,
                                    sellingPrice: rec.sellingPrice * rec.cuchuflisPerBag
                                });
                            }
                        }
                    }
                });
            }
        } catch (e) {
            appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
    } else {
        appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveState();
    }
}

function saveState() {
    localStorage.setItem("cuchufli_pro_state", JSON.stringify(appState));
}

// 3. Formatting Utilities
function formatCLP(value) {
    const roundedValue = Math.round(value);
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(roundedValue);
}

// Helper to get ingredient by ID
function getIngredientById(id) {
    return appState.ingredients.find(ing => ing.id === id);
}

// Helper to calculate ingredient cost contribution
function getIngredientUnitCost(ingredient) {
    if (!ingredient || ingredient.size <= 0) return 0;
    return ingredient.price / ingredient.size;
}

// 4. Tab Navigation Controller
function setupTabs() {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const targetTab = tab.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(content => {
                content.classList.remove("active");
            });
            
            const contentEl = document.getElementById(`tab-${targetTab}`);
            if (contentEl) {
                contentEl.classList.add("active");
            }
            
            // Re-render target contents if needed
            if (targetTab === "dashboard") {
                renderDashboard();
            } else if (targetTab === "inventory") {
                renderInventory();
            } else if (targetTab === "calculator") {
                renderCalculator();
            } else if (targetTab === "transactions") {
                renderTransactions();
            }
        });
    });
}

// 5. Theme controller
function setupTheme() {
    const themeBtn = document.getElementById("theme-toggle");
    const htmlEl = document.documentElement;
    const sunIcon = themeBtn.querySelector(".sun-icon");
    const moonIcon = themeBtn.querySelector(".moon-icon");

    const applyTheme = (theme) => {
        htmlEl.setAttribute("data-theme", theme);
        if (theme === "dark") {
            sunIcon.style.display = "none";
            moonIcon.style.display = "block";
        } else {
            sunIcon.style.display = "block";
            moonIcon.style.display = "none";
        }
    };

    applyTheme(appState.theme || "light");

    themeBtn.addEventListener("click", () => {
        appState.theme = htmlEl.getAttribute("data-theme") === "light" ? "dark" : "light";
        applyTheme(appState.theme);
        saveState();
    });
}

// 6. DASHBOARD RENDERING & ANALYTICS
function renderDashboard() {
    // Total Revenue from Sales
    const totalRevenue = appState.transactions
        .filter(t => t.type === "sale")
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    // Egresos en Caja: Direct expenses + Ingredient purchases (Boletas)
    const directExpenses = appState.transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalPurchases = appState.transactions
        .filter(t => t.type === "purchase")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalCashOutflow = directExpenses + totalPurchases;
    const netCashFlow = totalRevenue - totalCashOutflow;

    // Theoretical margin analysis (COGS-based)
    const cogs = appState.transactions
        .filter(t => t.type === "sale")
        .reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
    const netProfitTheoretical = totalRevenue - (cogs + directExpenses);
    const avgMargin = totalRevenue > 0 ? (netProfitTheoretical / totalRevenue) * 100 : 0;

    // Render KPI numbers
    document.getElementById("kpi-revenue").textContent = formatCLP(totalRevenue);
    document.getElementById("kpi-sales-count").textContent = `${appState.transactions.filter(t => t.type === "sale").length} venta(s) registrada(s)`;

    document.getElementById("kpi-expenses").textContent = formatCLP(totalCashOutflow);
    document.getElementById("kpi-expenses-info").textContent = `Boletas: ${formatCLP(totalPurchases)} | Extras: ${formatCLP(directExpenses)}`;

    document.getElementById("kpi-profit").textContent = formatCLP(netCashFlow);
    const profitStatusEl = document.getElementById("kpi-profit-status");
    if (netCashFlow > 0) {
        profitStatusEl.textContent = "Caja Neta positiva";
        profitStatusEl.className = "kpi-trend positive";
    } else if (netCashFlow < 0) {
        profitStatusEl.textContent = "Déficit en efectivo";
        profitStatusEl.className = "kpi-trend negative";
    } else {
        profitStatusEl.textContent = "Caja en equilibrio ($0)";
        profitStatusEl.className = "kpi-trend";
    }

    document.getElementById("kpi-margin").textContent = `${avgMargin.toFixed(1)}%`;
    const marginBar = document.getElementById("kpi-margin-bar");
    marginBar.style.width = `${Math.max(0, Math.min(100, avgMargin))}%`;
    if (avgMargin > 50) {
        marginBar.style.backgroundColor = "var(--success)";
    } else if (avgMargin > 20) {
        marginBar.style.backgroundColor = "var(--warning)";
    } else {
        marginBar.style.backgroundColor = "var(--danger)";
    }

    // Donut Chart logic (Cash flow view)
    const donutPercentageEl = document.getElementById("donut-percentage");
    const segmentCost = document.getElementById("donut-segment-cost");
    const segmentProfit = document.getElementById("donut-segment-profit");
    const legendCostEl = document.getElementById("legend-cost");
    const legendProfitEl = document.getElementById("legend-profit");

    legendCostEl.textContent = formatCLP(totalCashOutflow);
    legendProfitEl.textContent = formatCLP(Math.max(0, netCashFlow));

    if (totalRevenue > 0) {
        const cashOutflowPct = Math.min(100, (totalCashOutflow / totalRevenue) * 100);
        const cashFlowProfitPct = Math.max(0, (netCashFlow / totalRevenue) * 100);

        donutPercentageEl.textContent = `${cashFlowProfitPct.toFixed(0)}%`;

        segmentProfit.setAttribute("stroke-dasharray", `${cashFlowProfitPct} ${100 - cashFlowProfitPct}`);
        segmentCost.setAttribute("stroke-dasharray", `${cashOutflowPct} ${100 - cashOutflowPct}`);
        
        segmentProfit.setAttribute("stroke-dashoffset", "25");
        segmentCost.setAttribute("stroke-dashoffset", (25 - cashFlowProfitPct).toString());
    } else {
        donutPercentageEl.textContent = "0%";
        segmentProfit.setAttribute("stroke-dasharray", "0 100");
        segmentCost.setAttribute("stroke-dasharray", "0 100");
    }

    // Business insights list
    renderInsights(totalRevenue, totalCashOutflow, netCashFlow, avgMargin);
}

function renderInsights(totalRevenue, totalExpenses, netProfit, avgMargin) {
    const list = document.getElementById("insights-list");
    list.innerHTML = "";

    const addInsight = (text, bulletColor) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="insight-bullet ${bulletColor}"></span> ${text}`;
        list.appendChild(li);
    };

    if (appState.recipes.length === 0) {
        addInsight("¡Aún no tienes productos creados! Ve a <strong>Calculadora Lotes</strong> para armar tu primer lote.", "yellow");
        return;
    }

    // Insight 1: General financial health
    if (totalRevenue === 0) {
        addInsight("Empieza a registrar tus ventas en la pestaña <strong>Ventas y Gastos</strong> para activar el análisis financiero.", "yellow");
    } else if (netProfit > 0) {
        if (avgMargin >= 50) {
            addInsight(`¡Fantástico! Tu negocio tiene un margen del <strong>${avgMargin.toFixed(1)}%</strong>, lo cual es excelente para repostería.`, "yellow");
        } else {
            addInsight(`Margen del <strong>${avgMargin.toFixed(1)}%</strong>. Puedes mejorarlo subiendo levemente los precios o comprando ingredientes en formatos más grandes (más baratos).`, "yellow");
        }
    } else if (netProfit < 0) {
        addInsight("Tus gastos totales superan tus ventas actuales. Revisa si tus precios de venta cubren tus costos o si has tenido muchos gastos extras.", "brown");
    }

    // Insight 2: Recipe-specific margins
    appState.recipes.forEach(rec => {
        const recipeCost = calculateRecipeUnitCost(rec);
        const profit = rec.sellingPrice - recipeCost;
        const margin = rec.sellingPrice > 0 ? (profit / rec.sellingPrice) * 100 : 0;

        if (margin < 35) {
            addInsight(`<strong>${rec.name}</strong> tiene un margen bajo (<strong>${margin.toFixed(0)}%</strong>). Costo unitario: ${formatCLP(recipeCost)}, venta: ${formatCLP(rec.sellingPrice)}. Considera subirlo.`, "brown");
        } else if (margin >= 65) {
            addInsight(`¡Estrella comercial! <strong>${rec.name}</strong> tiene una alta rentabilidad (<strong>${margin.toFixed(0)}%</strong> por unidad).`, "yellow");
        }
    });

    // Insight 3: Direct expense burden
    if (totalRevenue > 0 && totalExpenses > 0) {
        const cogs = appState.transactions
            .filter(t => t.type === "sale")
            .reduce((sum, t) => sum + (t.estimatedCost || 0), 0);
        const direct = totalExpenses - cogs;
        const directRatio = (direct / totalExpenses) * 100;
        
        if (directRatio > 40) {
            addInsight(`Los gastos indirectos (servicios, gas, fletes) representan el <strong>${directRatio.toFixed(0)}%</strong> de tus egresos. Monitorea estos gastos adicionales.`, "brown");
        }
    }
}

// Helper to calculate cost of a recipe object dynamically
function calculateRecipeUnitCost(recipe) {
    if (!recipe || recipe.yield <= 0) return 0;
    let totalCost = 0;
    recipe.ingredients.forEach(item => {
        const ing = getIngredientById(item.id);
        if (ing) {
            totalCost += getIngredientUnitCost(ing) * item.quantity;
        }
    });
    return totalCost / recipe.yield;
}

// 7. INVENTORY (INGREDIENTS) MANAGEMENT
function renderInventory() {
    const listBody = document.getElementById("ingredients-list-body");
    listBody.innerHTML = "";

    if (appState.ingredients.length === 0) {
        listBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay ingredientes registrados. Registra uno para comenzar.</td></tr>`;
        return;
    }

    appState.ingredients.forEach(ing => {
        const tr = document.createElement("tr");
        
        const baseUnitCost = getIngredientUnitCost(ing);
        const baseUnitFormatted = `${formatCLP(baseUnitCost)} / ${ing.unit}`;

        tr.innerHTML = `
            <td><strong>${escapeHTML(ing.name)}</strong></td>
            <td><span class="badge">${ing.category}</span></td>
            <td>${ing.size} ${ing.unit}</td>
            <td>${formatCLP(ing.price)}</td>
            <td>${baseUnitFormatted}</td>
            <td>
                <div class="actions">
                    <button class="btn-action-icon edit" onclick="editIngredient('${ing.id}')" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="btn-action-icon delete" onclick="deleteIngredient('${ing.id}')" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });

    // Also update the dropdowns in the Recipe builder tab and sales tab
    updateIngredientDropdowns();
}

function updateIngredientDropdowns() {
    const dropdown = document.getElementById("select-calc-ingredient");
    const purchaseDropdown = document.getElementById("purchase-ingredient-id");
    
    if (dropdown) dropdown.innerHTML = "";
    if (purchaseDropdown) purchaseDropdown.innerHTML = '<option value="">-- Selecciona un ingrediente --</option>';
    
    if (appState.ingredients.length === 0) {
        if (dropdown) dropdown.innerHTML = `<option value="">-- No hay ingredientes en almacén --</option>`;
        return;
    }

    appState.ingredients.forEach(ing => {
        if (dropdown) {
            const option = document.createElement("option");
            option.value = ing.id;
            option.textContent = `${ing.name} (${ing.unit})`;
            dropdown.appendChild(option);
        }
        if (purchaseDropdown) {
            const option = document.createElement("option");
            option.value = ing.id;
            option.textContent = `${ing.name} (Paquete: ${formatCLP(ing.price)})`;
            purchaseDropdown.appendChild(option);
        }
    });

    // Trigger update of labels for units
    updateCalcUnitLabel();
}

function updateCalcUnitLabel() {
    const dropdown = document.getElementById("select-calc-ingredient");
    const label = document.getElementById("calc-unit-label");
    if (!dropdown || !label) return;

    const ingId = dropdown.value;
    if (ingId) {
        const ing = getIngredientById(ingId);
        if (ing) {
            label.textContent = ing.unit;
            return;
        }
    }
    label.textContent = "un";
}

// Add/Edit Ingredient Submit Handler
document.getElementById("ingredient-form").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const idInput = document.getElementById("ingredient-id").value;
    const name = document.getElementById("ingredient-name").value.trim();
    const category = document.getElementById("ingredient-category").value;
    const unit = document.getElementById("ingredient-unit").value;
    const price = parseFloat(document.getElementById("ingredient-price").value);
    const size = parseFloat(document.getElementById("ingredient-size").value);

    if (!name || isNaN(price) || isNaN(size) || size <= 0) {
        alert("Por favor completa todos los campos correctamente.");
        return;
    }

    if (idInput) {
        // Edit mode
        const index = appState.ingredients.findIndex(ing => ing.id === idInput);
        if (index !== -1) {
            appState.ingredients[index] = { id: idInput, name, category, unit, price, size };
        }
    } else {
        // Create mode
        const newIng = {
            id: `ing-${Date.now()}`,
            name,
            category,
            unit,
            price,
            size
        };
        appState.ingredients.push(newIng);
    }

    saveState();
    resetIngredientForm();
    renderInventory();
    
    // If the calculator has an active session, re-calculate
    updateRecipeBuilderOutput();
});

function editIngredient(id) {
    const ing = getIngredientById(id);
    if (!ing) return;

    document.getElementById("ingredient-id").value = ing.id;
    document.getElementById("ingredient-name").value = ing.name;
    document.getElementById("ingredient-category").value = ing.category;
    document.getElementById("ingredient-unit").value = ing.unit;
    document.getElementById("ingredient-price").value = ing.price;
    document.getElementById("ingredient-size").value = ing.size;

    document.getElementById("ingredient-form-title").textContent = "Editar Ingrediente / Material";
    document.getElementById("btn-save-ingredient").textContent = "Actualizar Ingrediente";
    document.getElementById("btn-cancel-ingredient").style.display = "inline-flex";

    // Scroll form into view if mobile
    document.getElementById("ingredient-form").scrollIntoView({ behavior: 'smooth' });
}

function deleteIngredient(id) {
    // Check if ingredient is used in any recipe
    const usedIn = appState.recipes.filter(rec => rec.ingredients.some(i => i.id === id));
    if (usedIn.length > 0) {
        const names = usedIn.map(r => r.name).join(", ");
        if (!confirm(`Este ingrediente es usado en los siguientes productos: ${names}. Si lo eliminas, los costos de esos productos se verán afectados. ¿Proceder de todos modos?`)) {
            return;
        }
    }

    appState.ingredients = appState.ingredients.filter(ing => ing.id !== id);
    
    // Also remove from any recipes ingredients list
    appState.recipes.forEach(rec => {
        rec.ingredients = rec.ingredients.filter(i => i.id !== id);
    });

    saveState();
    renderInventory();
    updateRecipeBuilderOutput();
}

function resetIngredientForm() {
    document.getElementById("ingredient-form").reset();
    document.getElementById("ingredient-id").value = "";
    document.getElementById("ingredient-form-title").textContent = "Añadir Ingrediente / Material";
    document.getElementById("btn-save-ingredient").textContent = "Guardar Ingrediente";
    document.getElementById("btn-cancel-ingredient").style.display = "none";
}

document.getElementById("btn-cancel-ingredient").addEventListener("click", resetIngredientForm);
document.getElementById("select-calc-ingredient").addEventListener("change", updateCalcUnitLabel);


// 8. RECIPE COST CALCULATOR
function renderCalculator() {
    // Populate select menu
    updateIngredientDropdowns();

    // Render Recipes Table
    renderRecipesList();

    // Render Current Build Output
    updateRecipeBuilderOutput();
}

// Add Ingredient to Current Recipe Build
document.getElementById("btn-add-ingredient-to-recipe").addEventListener("click", () => {
    const ingId = document.getElementById("select-calc-ingredient").value;
    const qty = parseFloat(document.getElementById("calc-ingredient-quantity").value);

    if (!ingId) {
        alert("Por favor selecciona un ingrediente.");
        return;
    }
    if (isNaN(qty) || qty <= 0) {
        alert("Por favor ingresa una cantidad válida mayor a cero.");
        return;
    }

    const ing = getIngredientById(ingId);
    if (!ing) return;

    // Check if already in build, if so update quantity
    const existing = currentRecipeIngredients.find(item => item.id === ingId);
    if (existing) {
        existing.quantity += qty;
    } else {
        currentRecipeIngredients.push({ id: ingId, quantity: qty });
    }

    document.getElementById("calc-ingredient-quantity").value = "";
    updateRecipeBuilderOutput();
});

// Render list of ingredients in current recipe building
function updateRecipeBuilderOutput() {
    const body = document.getElementById("recipe-ingredients-body");
    body.innerHTML = "";

    let totalBatchCost = 0;
    const yieldQty = parseInt(document.getElementById("recipe-yield").value) || 1;

    if (currentRecipeIngredients.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Aún no has agregado ingredientes a este lote.</td></tr>`;
    } else {
        currentRecipeIngredients.forEach((item, index) => {
            const ing = getIngredientById(item.id);
            if (!ing) return;

            const unitCost = getIngredientUnitCost(ing);
            const costContribution = unitCost * item.quantity;
            totalBatchCost += costContribution;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${escapeHTML(ing.name)}</strong></td>
                <td>${item.quantity.toFixed(1)} ${ing.unit}</td>
                <td>${formatCLP(costContribution)}</td>
                <td>
                    <button class="btn-action-icon delete btn-xs" onclick="removeIngredientFromRecipe(${index})" title="Eliminar del lote">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </td>
            `;
            body.appendChild(tr);
        });
    }

    // Calculations Box
    const unitCost = totalBatchCost / yieldQty;
    document.getElementById("summary-total-cost").textContent = formatCLP(totalBatchCost);
    document.getElementById("summary-unit-cost").textContent = formatCLP(unitCost);

    // Calculate dynamic bags assignment
    const assignedCuchuflis = currentRecipeFormats.reduce((sum, f) => sum + (f.cuchuflisPerBag * f.bagsCount), 0);
    const assignPct = yieldQty > 0 ? (assignedCuchuflis / yieldQty) * 100 : 0;
    const assignStatusEl = document.getElementById("summary-assign-status");
    assignStatusEl.textContent = `${assignedCuchuflis} de ${yieldQty} un. (${assignPct.toFixed(0)}%)`;
    
    if (assignedCuchuflis === yieldQty) {
        assignStatusEl.className = "badge-margin";
        assignStatusEl.style.backgroundColor = "var(--success-glow)";
        assignStatusEl.style.color = "var(--success)";
    } else if (assignedCuchuflis < yieldQty) {
        assignStatusEl.className = "badge-margin";
        assignStatusEl.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
        assignStatusEl.style.color = "var(--warning)";
    } else {
        assignStatusEl.className = "badge-margin";
        assignStatusEl.style.backgroundColor = "var(--danger-glow)";
        assignStatusEl.style.color = "var(--danger)";
    }

    const totalBags = currentRecipeFormats.reduce((sum, f) => sum + f.bagsCount, 0);
    document.getElementById("summary-total-bags").textContent = `${totalBags} bolsa(s)`;

    // Render distribution table
    renderDistributionTable(unitCost);

    // Toggle pricing setters based on format presence
    const isDistributed = currentRecipeFormats.length > 0;
    
    if (isDistributed) {
        document.getElementById("unit-pricing-slider-fields").style.display = "none";
        document.getElementById("dist-pricing-info").style.display = "block";
        document.getElementById("recipe-markup-references-section").style.display = "none";
        
        document.getElementById("unit-profit-preview").style.display = "none";
        document.getElementById("dist-profit-preview").style.display = "block";

        const totalRevenue = currentRecipeFormats.reduce((sum, f) => sum + (f.bagsCount * f.sellingPrice), 0);
        const totalProfit = totalRevenue - totalBatchCost;
        const marginPct = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        document.getElementById("preview-dist-revenue").textContent = formatCLP(totalRevenue);
        
        const remainder = yieldQty - assignedCuchuflis;
        let detailsHtml = currentRecipeFormats
            .filter(f => f.bagsCount > 0)
            .map(f => `${f.bagsCount} bolsa(s) de ${f.cuchuflisPerBag} un. x ${formatCLP(f.sellingPrice)}`)
            .join("<br>");
        if (remainder > 0) {
            detailsHtml += `<br><small class="text-muted">(${remainder} sueltos sin empaquetar)</small>`;
        } else if (remainder < 0) {
            detailsHtml += `<br><strong style="color: var(--danger);">(! Exceso: ${Math.abs(remainder)} un.)</strong>`;
        }
        document.getElementById("preview-dist-details").innerHTML = detailsHtml || "Ninguna bolsa asignada";

        updatePreviewProfitAndMargin(totalProfit, marginPct);
    } else {
        document.getElementById("unit-pricing-slider-fields").style.display = "block";
        document.getElementById("dist-pricing-info").style.display = "none";
        document.getElementById("recipe-markup-references-section").style.display = "block";
        
        document.getElementById("unit-profit-preview").style.display = "block";
        document.getElementById("dist-profit-preview").style.display = "none";

        const pricingSlider = document.getElementById("slider-selling-price");
        const maxSuggested = Math.ceil(unitCost * 3.5);
        pricingSlider.min = Math.floor(unitCost).toString();
        pricingSlider.max = Math.max(1000, maxSuggested).toString();
        
        let activePrice = parseFloat(pricingSlider.value);
        if (activePrice < unitCost) {
            activePrice = Math.round(unitCost * 2);
            pricingSlider.value = activePrice.toString();
        }

        updateProfitMath(activePrice, unitCost, yieldQty);
    }
}

function renderDistributionTable(unitCost) {
    const tbody = document.getElementById("distribution-tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    if (currentRecipeFormats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 12px;">No hay formatos configurados. Se usará el precio unitario general.</td></tr>`;
        return;
    }
    
    currentRecipeFormats.forEach((fmt, index) => {
        const bagCost = unitCost * fmt.cuchuflisPerBag;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <input type="number" class="dist-input dist-cuchuflis" data-index="${index}" min="1" value="${fmt.cuchuflisPerBag}" style="width: 75px; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
            </td>
            <td>
                <input type="number" class="dist-input dist-bags" data-index="${index}" min="0" value="${fmt.bagsCount}" style="width: 75px; padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
            </td>
            <td>
                <div style="display: inline-flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; background: var(--bg-card);">
                    <span style="padding: 6px 8px; background: var(--bg-card-hover); color: var(--text-muted); font-size: 0.85rem; font-weight: 600; border-right: 1px solid var(--border-color);">$</span>
                    <input type="number" class="dist-input dist-price" data-index="${index}" min="0" value="${fmt.sellingPrice}" style="width: 80px; padding: 6px; border: none; background: transparent; color: var(--text-main); font-family: inherit; font-size: 0.95rem; text-align: right;">
                </div>
            </td>
            <td style="vertical-align: middle;">
                <strong>${formatCLP(bagCost)}</strong>
            </td>
            <td style="vertical-align: middle;">
                <button type="button" class="btn-action-icon delete btn-xs" onclick="removeDistributionRow(${index})" title="Eliminar formato">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Wire up input changes
    tbody.querySelectorAll(".dist-input").forEach(input => {
        input.addEventListener("input", (e) => {
            const idx = parseInt(e.target.getAttribute("data-index"));
            const val = parseFloat(e.target.value) || 0;
            if (e.target.classList.contains("dist-cuchuflis")) {
                currentRecipeFormats[idx].cuchuflisPerBag = Math.max(1, parseInt(val) || 1);
            } else if (e.target.classList.contains("dist-bags")) {
                currentRecipeFormats[idx].bagsCount = Math.max(0, parseInt(val) || 0);
            } else if (e.target.classList.contains("dist-price")) {
                currentRecipeFormats[idx].sellingPrice = Math.max(0, val);
            }
            updateRecipeBuilderOutput();
        });
    });
}

window.removeDistributionRow = function(index) {
    currentRecipeFormats.splice(index, 1);
    updateRecipeBuilderOutput();
};

document.getElementById("btn-add-distribution-row").addEventListener("click", () => {
    // Add default format: 4 cuchuflís, 0 bags, 1000 selling price
    currentRecipeFormats.push({ cuchuflisPerBag: 4, bagsCount: 0, sellingPrice: 1000 });
    updateRecipeBuilderOutput();
});

function removeIngredientFromRecipe(index) {
    currentRecipeIngredients.splice(index, 1);
    updateRecipeBuilderOutput();
}

// Handle yield changes in real-time
document.getElementById("recipe-yield").addEventListener("input", updateRecipeBuilderOutput);

// Selling Price Inputs handlers
const sliderSelling = document.getElementById("slider-selling-price");
const inputSelling = document.getElementById("input-selling-price");

function handlePriceChange(val) {
    const price = parseFloat(val) || 0;
    document.getElementById("label-selling-price").textContent = formatCLP(price);
    inputSelling.value = price > 0 ? price : "";
    
    const yieldQty = parseInt(document.getElementById("recipe-yield").value) || 1;
    let totalCost = 0;
    currentRecipeIngredients.forEach(item => {
        const ing = getIngredientById(item.id);
        if (ing) totalCost += getIngredientUnitCost(ing) * item.quantity;
    });
    const unitCost = totalCost / yieldQty;

    updateProfitMath(price, unitCost, yieldQty);
}

sliderSelling.addEventListener("input", (e) => handlePriceChange(e.target.value));
inputSelling.addEventListener("input", (e) => {
    sliderSelling.value = e.target.value;
    handlePriceChange(e.target.value);
});

function updatePreviewProfitAndMargin(totalProfit, marginPct) {
    const marginBadge = document.getElementById("preview-margin-pct");
    marginBadge.textContent = `${marginPct.toFixed(1)}%`;
    
    if (marginPct >= 50) {
        marginBadge.style.backgroundColor = "var(--success-glow)";
        marginBadge.style.color = "var(--success)";
    } else if (marginPct > 15) {
        marginBadge.style.backgroundColor = "rgba(245, 158, 11, 0.1)";
        marginBadge.style.color = "var(--warning)";
    } else {
        marginBadge.style.backgroundColor = "var(--danger-glow)";
        marginBadge.style.color = "var(--danger)";
    }

    const profitValEl = document.getElementById("preview-total-profit");
    profitValEl.textContent = formatCLP(totalProfit);
    if (totalProfit >= 0) {
        profitValEl.className = "text-success font-large";
    } else {
        profitValEl.className = "text-danger font-large";
    }
}

function updateProfitMath(sellingPrice, unitCost, yieldQty) {
    document.getElementById("label-selling-price").textContent = formatCLP(sellingPrice);
    document.getElementById("preview-sell-price").textContent = formatCLP(sellingPrice);

    const profitPerUnit = sellingPrice - unitCost;
    const profitValEl = document.getElementById("preview-unit-profit");
    profitValEl.textContent = formatCLP(profitPerUnit);
    
    if (profitPerUnit >= 0) {
        profitValEl.className = "text-success font-large";
    } else {
        profitValEl.className = "text-danger font-large";
    }

    const marginPct = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;
    const totalProfit = profitPerUnit * yieldQty;
    
    updatePreviewProfitAndMargin(totalProfit, marginPct);
}

// Save Recipe / Product Button
document.getElementById("btn-save-recipe").addEventListener("click", () => {
    const name = document.getElementById("recipe-name").value.trim();
    const yieldQty = parseInt(document.getElementById("recipe-yield").value) || 0;
    const sellingPrice = parseFloat(sliderSelling.value) || 0;

    if (!name) {
        alert("Por favor ingresa un nombre para el lote de producción / producto.");
        return;
    }
    if (yieldQty <= 0) {
        alert("La cantidad de cuchuflís debe ser mayor a cero.");
        return;
    }
    if (currentRecipeIngredients.length === 0) {
        alert("Por favor añade al menos un ingrediente a tu lote.");
        return;
    }
    if (sellingPrice < 0) {
        alert("El precio de venta no puede ser negativo.");
        return;
    }

    // Save recipe
    const newRecipe = {
        id: `rec-${Date.now()}`,
        name,
        yield: yieldQty,
        ingredients: JSON.parse(JSON.stringify(currentRecipeIngredients)),
        formats: JSON.parse(JSON.stringify(currentRecipeFormats)),
        sellingPrice: currentRecipeFormats.length > 0 ? 0 : sellingPrice
    };

    appState.recipes.push(newRecipe);
    saveState();

    // Reset Recipe Builder state
    currentRecipeIngredients = [];
    currentRecipeFormats = [];
    document.getElementById("recipe-name").value = "";
    document.getElementById("recipe-yield").value = "120";
    
    alert("¡Producto y Lote guardados correctamente!");
    
    updateRecipesDropdowns();
});

function renderRecipesList() {
    const body = document.getElementById("recipes-list-body");
    body.innerHTML = "";

    if (appState.recipes.length === 0) {
        body.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No hay recetas o productos guardados.</td></tr>`;
        return;
    }

    appState.recipes.forEach(rec => {
        const recipeCost = calculateRecipeUnitCost(rec);
        const totalCost = recipeCost * rec.yield;
        
        let formatString = "Granel";
        let bagCostSellString = "-";
        let profit = 0;
        let margin = 0;
        let sellingPriceFormatted = "";

        if (rec.formats && rec.formats.length > 0) {
            // Distributed packaging mode
            formatString = rec.formats.map(f => `${f.bagsCount} bolsita(s) (de ${f.cuchuflisPerBag})`).join("<br>");
            bagCostSellString = rec.formats
                .map(f => `${f.cuchuflisPerBag} un: <strong>${formatCLP(recipeCost * f.cuchuflisPerBag)}</strong> / <strong style="color: var(--primary);">${formatCLP(f.sellingPrice)}</strong>`)
                .join("<br>");
            
            const totalRevenue = rec.formats.reduce((sum, f) => sum + (f.bagsCount * f.sellingPrice), 0);
            const totalProfit = totalRevenue - totalCost;
            profit = totalProfit / rec.yield; // average profit per unit
            margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
            
            const avgSellPrice = totalRevenue / rec.yield;
            sellingPriceFormatted = `${formatCLP(avgSellPrice)} <small class="text-muted">(prom.)</small>`;
        } else {
            // Unit price mode
            formatString = "Granel";
            bagCostSellString = "-";
            profit = rec.sellingPrice - recipeCost;
            margin = rec.sellingPrice > 0 ? (profit / rec.sellingPrice) * 100 : 0;
            sellingPriceFormatted = formatCLP(rec.sellingPrice);
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${escapeHTML(rec.name)}</strong></td>
            <td>${rec.yield} un</td>
            <td><span class="badge" style="background-color: var(--bg-card-hover); color: var(--text-main); border: 1px solid var(--border-color); text-align: left; padding: 4px 8px; height: auto; font-size: 0.82rem; line-height: 1.3;">${formatString}</span></td>
            <td>${formatCLP(totalCost)}</td>
            <td>${formatCLP(recipeCost)}</td>
            <td>${sellingPriceFormatted}</td>
            <td style="font-size: 0.88rem; line-height: 1.3;">${bagCostSellString}</td>
            <td class="${profit >= 0 ? 'text-success' : 'text-danger'}">${formatCLP(profit)} <small class="text-muted">/u</small></td>
            <td><span class="badge-margin" style="background-color: ${margin >= 50 ? 'var(--success-glow)' : margin > 15 ? 'rgba(245,158,11,0.1)' : 'var(--danger-glow)'}; color: ${margin >= 50 ? 'var(--success)' : margin > 15 ? 'var(--warning)' : 'var(--danger)'}">${margin.toFixed(0)}%</span></td>
            <td>
                <div class="actions">
                    <button class="btn-action-icon edit" onclick="loadRecipeToCalculator('${rec.id}')" title="Cargar en Calculadora">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
                    </button>
                    <button class="btn-action-icon delete" onclick="deleteRecipe('${rec.id}')" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
}

function deleteRecipe(id) {
    if (!confirm("¿Seguro que deseas eliminar este producto/receta? Esto no eliminará tus registros de ventas históricas, pero el producto ya no estará disponible para nuevas ventas.")) {
        return;
    }
    appState.recipes = appState.recipes.filter(r => r.id !== id);
    saveState();
    renderRecipesList();
    updateRecipesDropdowns();
}

function loadRecipeToCalculator(id) {
    const rec = appState.recipes.find(r => r.id === id);
    if (!rec) return;

    document.getElementById("recipe-name").value = rec.name;
    document.getElementById("recipe-yield").value = rec.yield;
    
    currentRecipeFormats = JSON.parse(JSON.stringify(rec.formats || []));
    
    sliderSelling.value = rec.sellingPrice;
    inputSelling.value = rec.sellingPrice;

    currentRecipeIngredients = JSON.parse(JSON.stringify(rec.ingredients));
    
    // Switch tabs in builder depending on if recipe is Oreo-based
    const isOreoRecipe = rec.name.toLowerCase().includes("oreo");
    const tabCuchufli = document.getElementById("recipe-tab-cuchufli");
    const tabAlfajor = document.getElementById("recipe-tab-alfajor");
    const wizardPanel = document.getElementById("oreo-wizard-panel");
    const yieldLabel = document.getElementById("recipe-yield-label");

    if (tabCuchufli && tabAlfajor && wizardPanel && yieldLabel) {
        if (isOreoRecipe) {
            tabAlfajor.classList.add("active");
            tabCuchufli.classList.remove("active");
            wizardPanel.style.display = "block";
            yieldLabel.textContent = "Cantidad Total de Alfajores Producidos";
            
            // Auto-fill wizard inputs
            const oreoPackages = document.getElementById("oreo-packages");
            const oreoYield = document.getElementById("oreo-yield");
            if (oreoPackages && oreoYield) {
                oreoYield.value = rec.yield;
                oreoPackages.value = (rec.yield / 6).toFixed(2);
                setTimeout(updateOreoWizardSuggestions, 0);
            }
        } else {
            tabCuchufli.classList.add("active");
            tabAlfajor.classList.remove("active");
            wizardPanel.style.display = "none";
            yieldLabel.textContent = "Cantidad Total de Cuchuflís Producidos";
        }
    }

    updateRecipeBuilderOutput();

    // Scroll up to recipe editor
    document.getElementById("recipe-info-form").scrollIntoView({ behavior: 'smooth' });
}


// 9. TRANSACTION TRACKER (SALES & EXPENSES)
function renderTransactions() {
    updateRecipesDropdowns();
    updateIngredientDropdowns(); // Ensure purchase dropdown has fresh values

    const body = document.getElementById("transactions-list-body");
    body.innerHTML = "";

    if (appState.transactions.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Aún no hay transacciones en el historial.</td></tr>`;
        return;
    }

    // Sort by date desc
    const sorted = [...appState.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(tx => {
        const tr = document.createElement("tr");
        
        let typeBadge = "";
        let details = "";
        let amountFormatted = "";
        let profitFormatted = "-";

        if (tx.type === "sale") {
            typeBadge = '<span class="badge-margin" style="background-color: var(--success-glow); color: var(--success);">Venta</span>';
            let saleDetailsText = "";
            if (tx.soldAsBags) {
                const formatLabel = tx.formatName || "Bolsa";
                saleDetailsText = `<strong>${tx.bagsQuantity} bolsita(s) (${formatLabel})</strong> x ${formatCLP(tx.bagPrice)} <small class="text-muted">(${tx.quantity} un. a ${formatCLP(tx.unitPrice)} c/u)</small>`;
            } else {
                saleDetailsText = `${tx.quantity} unidades sueltas x ${formatCLP(tx.unitPrice)}`;
            }
            details = `<strong>${escapeHTML(tx.recipeName)}</strong><br><small class="text-muted">${saleDetailsText} ${tx.notes ? `(${escapeHTML(tx.notes)})` : ""}</small>`;
            amountFormatted = `<span class="text-success">+ ${formatCLP(tx.totalAmount)}</span>`;
            profitFormatted = `<span class="text-success">${formatCLP(tx.estimatedProfit)}</span>`;
        } else if (tx.type === "purchase") {
            typeBadge = '<span class="badge-margin" style="background-color: rgba(245, 158, 11, 0.1); color: var(--warning);">Compra</span>';
            details = `<strong>Compra: ${escapeHTML(tx.ingredientName)}</strong><br><small class="text-muted">${tx.quantity} paq x ${formatCLP(tx.pricePerPackage)} ${tx.notes ? `(${escapeHTML(tx.notes)})` : ""}</small>`;
            amountFormatted = `<span class="text-danger">- ${formatCLP(tx.amount)}</span>`;
        } else {
            typeBadge = '<span class="badge-margin" style="background-color: var(--danger-glow); color: var(--danger);">Gasto</span>';
            details = `<strong>${escapeHTML(tx.description)}</strong><br><small class="text-muted">Categoría: ${tx.category}</small>`;
            amountFormatted = `<span class="text-danger">- ${formatCLP(tx.amount)}</span>`;
        }

        tr.innerHTML = `
            <td>${tx.date}</td>
            <td>${typeBadge}</td>
            <td>${details}</td>
            <td>${amountFormatted}</td>
            <td>${profitFormatted}</td>
            <td>
                <button class="btn-action-icon delete btn-xs" onclick="deleteTransaction('${tx.id}')" title="Eliminar transacción">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </td>
        `;
        body.appendChild(tr);
    });
}

function updateRecipesDropdowns() {
    const dropdown = document.getElementById("sale-recipe-id");
    if (!dropdown) return;

    dropdown.innerHTML = '<option value="">-- Selecciona un producto --</option>';
    
    appState.recipes.forEach(rec => {
        const option = document.createElement("option");
        option.value = rec.id;
        
        let priceText = "";
        if (rec.formats && rec.formats.length > 0) {
            const formatsDesc = rec.formats.map(f => `${f.bagsCount} de ${f.cuchuflisPerBag}u`).join(", ");
            priceText = `empaque: ${formatsDesc}`;
        } else {
            priceText = `Venta: ${formatCLP(rec.sellingPrice)}`;
        }
        option.textContent = `${rec.name} (${priceText})`;
        dropdown.appendChild(option);
    });
}

function updateSaleFormatOptions(rec) {
    const select = document.getElementById("sale-format-select");
    if (!select) return;
    select.innerHTML = "";
    
    // 1. Unidades sueltas
    const unitCost = calculateRecipeUnitCost(rec);
    const suggestedUnitSell = Math.round(unitCost * 2);
    const unitPrice = rec.sellingPrice > 0 ? rec.sellingPrice : suggestedUnitSell;
    
    const optUnits = document.createElement("option");
    optUnits.value = "units";
    optUnits.textContent = `Unidades Sueltas (${formatCLP(unitPrice)} c/u)`;
    select.appendChild(optUnits);

    // 2. Defined formats
    if (rec.formats && rec.formats.length > 0) {
        rec.formats.forEach((fmt, idx) => {
            const opt = document.createElement("option");
            opt.value = `format-${idx}`;
            opt.textContent = `Bolsita de ${fmt.cuchuflisPerBag} un. (${formatCLP(fmt.sellingPrice)})`;
            select.appendChild(opt);
        });
    } else {
        // Fallbacks
        const optBags4 = document.createElement("option");
        optBags4.value = "legacy-bag-4";
        optBags4.textContent = `Bolsita de 4 un. (${formatCLP(unitPrice * 4)})`;
        select.appendChild(optBags4);

        const optBags5 = document.createElement("option");
        optBags5.value = "legacy-bag-5";
        optBags5.textContent = `Bolsita de 5 un. (${formatCLP(unitPrice * 5)})`;
        select.appendChild(optBags5);
    }
}

// Auto-fill selling price based on selected product and handle packaging modes
function updateSaleFormLabelsAndCalculations() {
    const recipeId = document.getElementById("sale-recipe-id").value;
    const formatGroup = document.getElementById("sale-format-selector-group");
    const labelQty = document.getElementById("label-sale-quantity");
    const labelPrice = document.getElementById("label-sale-price");
    const qtyInput = document.getElementById("sale-quantity");
    const priceInput = document.getElementById("sale-unit-price");
    const equivGroup = document.getElementById("sale-equivalence-group");
    const equivHelper = document.getElementById("sale-equivalence-helper");

    if (!recipeId) {
        formatGroup.style.display = "none";
        equivGroup.style.display = "none";
        labelQty.textContent = "Cantidad Vendida";
        labelPrice.textContent = "Precio Unitario Aplicado ($)";
        qtyInput.placeholder = "Ej: 12";
        priceInput.placeholder = "Ej: 400";
        return;
    }

    const rec = appState.recipes.find(r => r.id === recipeId);
    if (!rec) return;

    formatGroup.style.display = "block";

    const select = document.getElementById("sale-format-select");
    const formatValue = select.value;
    let cuchuflisPerBag = 1;
    let defaultPrice = rec.sellingPrice;
    let isBag = false;

    if (formatValue === "units") {
        labelQty.textContent = "Cantidad Vendida (Unidades)";
        labelPrice.textContent = "Precio por Cuchuflí ($)";
        qtyInput.placeholder = "Ej: 12";
        
        const unitCost = calculateRecipeUnitCost(rec);
        const suggestedUnitSell = Math.round(unitCost * 2);
        defaultPrice = rec.sellingPrice > 0 ? rec.sellingPrice : suggestedUnitSell;
        isBag = false;
    } else if (formatValue.startsWith("format-")) {
        const idx = parseInt(formatValue.split("-")[1]);
        const fmt = rec.formats[idx];
        cuchuflisPerBag = fmt.cuchuflisPerBag;
        defaultPrice = fmt.sellingPrice;
        labelQty.textContent = "Bolsitas Vendidas";
        labelPrice.textContent = "Precio por Bolsita ($)";
        qtyInput.placeholder = "Ej: 5";
        isBag = true;
    } else if (formatValue === "legacy-bag-4") {
        cuchuflisPerBag = 4;
        const unitCost = calculateRecipeUnitCost(rec);
        const suggestedUnitSell = Math.round(unitCost * 2);
        const unitPrice = rec.sellingPrice > 0 ? rec.sellingPrice : suggestedUnitSell;
        defaultPrice = unitPrice * 4;
        labelQty.textContent = "Bolsitas Vendidas";
        labelPrice.textContent = "Precio por Bolsita ($)";
        qtyInput.placeholder = "Ej: 5";
        isBag = true;
    } else if (formatValue === "legacy-bag-5") {
        cuchuflisPerBag = 5;
        const unitCost = calculateRecipeUnitCost(rec);
        const suggestedUnitSell = Math.round(unitCost * 2);
        const unitPrice = rec.sellingPrice > 0 ? rec.sellingPrice : suggestedUnitSell;
        defaultPrice = unitPrice * 5;
        labelQty.textContent = "Bolsitas Vendidas";
        labelPrice.textContent = "Precio por Bolsita ($)";
        qtyInput.placeholder = "Ej: 5";
        isBag = true;
    }

    // Auto-fill price if format changed or input is empty
    const lastFormat = select.getAttribute("data-last-format");
    if (lastFormat !== formatValue || !priceInput.value) {
        priceInput.value = defaultPrice;
        select.setAttribute("data-last-format", formatValue);
    }

    // Live calculations helper
    const qty = parseFloat(qtyInput.value) || 0;
    const priceVal = parseFloat(priceInput.value) || 0;

    if (qty > 0) {
        equivGroup.style.display = "block";
        if (isBag) {
            const totalUnits = qty * cuchuflisPerBag;
            const unitPrice = priceVal / cuchuflisPerBag;
            equivHelper.innerHTML = `Equivale a <strong>${totalUnits}</strong> cuchuflís a <strong>${formatCLP(unitPrice)}</strong> c/u (Total: <strong>${formatCLP(qty * priceVal)}</strong>)`;
            equivHelper.className = "sale-equivalence-text";
        } else {
            equivHelper.innerHTML = `Total Venta: <strong>${formatCLP(qty * priceVal)}</strong> por <strong>${qty}</strong> cuchuflís sueltos.`;
            equivHelper.className = "sale-equivalence-text bags";
        }
    } else {
        equivGroup.style.display = "none";
    }
}

// Event Listeners for Sale Form
document.getElementById("sale-recipe-id").addEventListener("change", (e) => {
    const select = document.getElementById("sale-format-select");
    select.innerHTML = "";
    select.removeAttribute("data-last-format");
    
    document.getElementById("sale-quantity").value = "";
    document.getElementById("sale-unit-price").value = "";
    
    const recipeId = e.target.value;
    if (recipeId) {
        const rec = appState.recipes.find(r => r.id === recipeId);
        if (rec) {
            updateSaleFormatOptions(rec);
        }
    }
    updateSaleFormLabelsAndCalculations();
});

document.getElementById("sale-format-select").addEventListener("change", updateSaleFormLabelsAndCalculations);
document.getElementById("sale-quantity").addEventListener("input", updateSaleFormLabelsAndCalculations);
document.getElementById("sale-unit-price").addEventListener("input", updateSaleFormLabelsAndCalculations);

// Tab toggle inside transaction form card (Venta / Gasto / Compra)
const tabSaleBtn = document.getElementById("form-tab-sale");
const tabExpenseBtn = document.getElementById("form-tab-expense");
const tabPurchaseBtn = document.getElementById("form-tab-purchase");
const saleForm = document.getElementById("sale-form");
const expenseForm = document.getElementById("expense-form");
const purchaseForm = document.getElementById("purchase-form");

tabSaleBtn.addEventListener("click", () => {
    tabSaleBtn.classList.add("active");
    tabExpenseBtn.classList.remove("active");
    tabPurchaseBtn.classList.remove("active");
    saleForm.classList.add("active");
    expenseForm.classList.remove("active");
    purchaseForm.classList.remove("active");
});

tabExpenseBtn.addEventListener("click", () => {
    tabExpenseBtn.classList.add("active");
    tabSaleBtn.classList.remove("active");
    tabPurchaseBtn.classList.remove("active");
    expenseForm.classList.add("active");
    saleForm.classList.remove("active");
    purchaseForm.classList.remove("active");
});

tabPurchaseBtn.addEventListener("click", () => {
    tabPurchaseBtn.classList.add("active");
    tabSaleBtn.classList.remove("active");
    tabExpenseBtn.classList.remove("active");
    purchaseForm.classList.add("active");
    saleForm.classList.remove("active");
    expenseForm.classList.remove("active");
});

// Set current date in forms by default
function resetTransactionDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("sale-date").value = today;
    document.getElementById("expense-date").value = today;
    if (document.getElementById("purchase-date")) {
        document.getElementById("purchase-date").value = today;
    }
}

// Submit Sale Form
document.getElementById("sale-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const recipeId = document.getElementById("sale-recipe-id").value;
    const qty = parseInt(document.getElementById("sale-quantity").value);
    const unitPrice = parseFloat(document.getElementById("sale-unit-price").value);
    const date = document.getElementById("sale-date").value;
    const notes = document.getElementById("sale-notes").value.trim();

    if (!recipeId || isNaN(qty) || qty <= 0 || isNaN(unitPrice) || !date) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    const rec = appState.recipes.find(r => r.id === recipeId);
    if (!rec) return;

    const unitCost = calculateRecipeUnitCost(rec);
    const formatValue = document.getElementById("sale-format-select").value;
    let cuchuflisPerBag = 1;
    let isBags = false;

    if (formatValue === "units") {
        cuchuflisPerBag = 1;
        isBags = false;
    } else if (formatValue.startsWith("format-")) {
        const idx = parseInt(formatValue.split("-")[1]);
        cuchuflisPerBag = rec.formats[idx].cuchuflisPerBag;
        isBags = true;
    } else if (formatValue === "legacy-bag-4") {
        cuchuflisPerBag = 4;
        isBags = true;
    } else if (formatValue === "legacy-bag-5") {
        cuchuflisPerBag = 5;
        isBags = true;
    }

    let finalQuantity = qty;
    let finalUnitPrice = unitPrice;
    let totalAmount = qty * unitPrice;

    if (isBags) {
        finalQuantity = qty * cuchuflisPerBag;
        finalUnitPrice = unitPrice / cuchuflisPerBag;
    }

    const estimatedCost = finalQuantity * unitCost;
    const estimatedProfit = totalAmount - estimatedCost;

    const newSale = {
        id: `tx-${Date.now()}`,
        type: "sale",
        recipeId,
        recipeName: rec.name,
        quantity: finalQuantity,
        unitPrice: finalUnitPrice,
        totalAmount,
        estimatedCost,
        estimatedProfit,
        date,
        notes,
        soldAsBags: isBags,
        bagsQuantity: isBags ? qty : 0,
        bagPrice: isBags ? unitPrice : 0,
        formatName: isBags ? `Bolsa de ${cuchuflisPerBag} un.` : "Suelto"
    };

    appState.transactions.push(newSale);
    saveState();
    
    // Reset form
    document.getElementById("sale-form").reset();
    document.getElementById("sale-format-select").innerHTML = "";
    document.getElementById("sale-format-select").removeAttribute("data-last-format");
    updateSaleFormLabelsAndCalculations();
    resetTransactionDates();

    alert("¡Venta registrada con éxito!");
    renderTransactions();
    renderDashboard(); // Ensure dashboard values are re-rendered
});

// Submit Expense Form
document.getElementById("expense-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const desc = document.getElementById("expense-description").value.trim();
    const amount = parseFloat(document.getElementById("expense-amount").value);
    const date = document.getElementById("expense-date").value;
    const category = document.getElementById("expense-category").value;

    if (!desc || isNaN(amount) || amount <= 0 || !date || !category) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    const newExpense = {
        id: `tx-${Date.now()}`,
        type: "expense",
        description: desc,
        amount,
        date,
        category
    };

    appState.transactions.push(newExpense);
    saveState();

    // Reset form
    document.getElementById("expense-form").reset();
    resetTransactionDates();

    alert("¡Gasto extra registrado!");
    renderTransactions();
});

// Auto-fill and calculate total purchase price based on selected ingredient and package count
function updatePurchaseTotal() {
    const ingredientId = document.getElementById("purchase-ingredient-id").value;
    const qty = parseInt(document.getElementById("purchase-quantity").value) || 1;
    const totalInput = document.getElementById("purchase-total-price");
    
    if (ingredientId) {
        const ing = getIngredientById(ingredientId);
        if (ing) {
            totalInput.value = ing.price * qty;
            return;
        }
    }
    totalInput.value = "";
}

document.getElementById("purchase-ingredient-id").addEventListener("change", updatePurchaseTotal);
document.getElementById("purchase-quantity").addEventListener("input", updatePurchaseTotal);

// Submit Purchase Form (Boleta de Insumos)
document.getElementById("purchase-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const ingredientId = document.getElementById("purchase-ingredient-id").value;
    const qty = parseInt(document.getElementById("purchase-quantity").value);
    const amount = parseFloat(document.getElementById("purchase-total-price").value);
    const date = document.getElementById("purchase-date").value;
    const notes = document.getElementById("purchase-notes").value.trim();

    if (!ingredientId || isNaN(qty) || qty <= 0 || isNaN(amount) || amount < 0 || !date) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    const ing = getIngredientById(ingredientId);
    if (!ing) return;

    const newPurchase = {
        id: `tx-${Date.now()}`,
        type: "purchase",
        ingredientId,
        ingredientName: ing.name,
        quantity: qty,
        pricePerPackage: ing.price,
        amount,
        date,
        notes
    };

    appState.transactions.push(newPurchase);
    saveState();

    // Reset Form
    document.getElementById("purchase-form").reset();
    resetTransactionDates();

    alert("¡Compra de ingrediente registrada con éxito!");
    renderTransactions();
    renderDashboard();
});

function deleteTransaction(id) {
    if (!confirm("¿Eliminar esta transacción del historial?")) {
        return;
    }
    appState.transactions = appState.transactions.filter(t => t.id !== id);
    saveState();
    renderTransactions();
}

document.getElementById("btn-clear-transactions").addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas vaciar todo el historial de ventas y gastos? Esta acción no se puede deshacer.")) {
        appState.transactions = [];
        saveState();
        renderTransactions();
    }
});


// 10. QUICK ACTION BUTTONS (Navigate to correct tab + form)
const quickSaleBtn = document.getElementById("quick-add-sale-btn");
const quickExpenseBtn = document.getElementById("quick-add-expense-btn");

// Helper: navigate to a main tab programmatically
function navigateToTab(tabName) {
    const tabs = document.querySelectorAll(".nav-tab");
    tabs.forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetNavTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetNavTab) targetNavTab.classList.add("active");
    if (targetContent) targetContent.classList.add("active");

    // Re-render the target tab
    if (tabName === "dashboard") renderDashboard();
    else if (tabName === "inventory") renderInventory();
    else if (tabName === "calculator") renderCalculator();
    else if (tabName === "transactions") renderTransactions();
}

// Helper: activate a specific form sub-tab inside Transactions
function activateFormTab(formType) {
    // formType: "sale" | "expense" | "purchase"
    const btnMap = { sale: tabSaleBtn, expense: tabExpenseBtn, purchase: tabPurchaseBtn };
    const formMap = { sale: saleForm, expense: expenseForm, purchase: purchaseForm };

    [tabSaleBtn, tabExpenseBtn, tabPurchaseBtn].forEach(b => b.classList.remove("active"));
    [saleForm, expenseForm, purchaseForm].forEach(f => f.classList.remove("active"));

    if (btnMap[formType]) btnMap[formType].classList.add("active");
    if (formMap[formType]) formMap[formType].classList.add("active");
}

quickSaleBtn.addEventListener("click", () => {
    navigateToTab("transactions");
    activateFormTab("sale");
    updateRecipesDropdowns();
    resetTransactionDates();
    updateSaleFormLabelsAndCalculations();
    // Smooth scroll to form
    const formCard = document.querySelector("#tab-transactions .form-card");
    if (formCard) formCard.scrollIntoView({ behavior: "smooth", block: "start" });
});

quickExpenseBtn.addEventListener("click", () => {
    navigateToTab("transactions");
    activateFormTab("expense");
    resetTransactionDates();
    const formCard = document.querySelector("#tab-transactions .form-card");
    if (formCard) formCard.scrollIntoView({ behavior: "smooth", block: "start" });
});


// 10.5 OREO ALFAJORES WIZARD & LOGIC
function setupOreoWizard() {
    const tabCuchufli = document.getElementById("recipe-tab-cuchufli");
    const tabAlfajor = document.getElementById("recipe-tab-alfajor");
    const wizardPanel = document.getElementById("oreo-wizard-panel");
    const yieldLabel = document.getElementById("recipe-yield-label");
    const recipeNameInput = document.getElementById("recipe-name");
    const recipeYieldInput = document.getElementById("recipe-yield");

    if (!tabCuchufli || !tabAlfajor) return;

    tabCuchufli.addEventListener("click", () => {
        tabCuchufli.classList.add("active");
        tabAlfajor.classList.remove("active");
        if (wizardPanel) wizardPanel.style.display = "none";
        if (yieldLabel) yieldLabel.textContent = "Cantidad Total de Cuchuflís Producidos";
    });

    tabAlfajor.addEventListener("click", () => {
        tabAlfajor.classList.add("active");
        tabCuchufli.classList.remove("active");
        if (wizardPanel) wizardPanel.style.display = "block";
        if (yieldLabel) yieldLabel.textContent = "Cantidad Total de Alfajores Producidos";
        if (recipeNameInput && !recipeNameInput.value.trim()) {
            recipeNameInput.value = "Alfajores Oreo";
        }
        updateOreoWizardSuggestions();
    });

    // Wizard inputs: packages and yield synchronization
    const oreoPackages = document.getElementById("oreo-packages");
    const oreoYield = document.getElementById("oreo-yield");
    const oreoManjar = document.getElementById("oreo-manjar-ratio");
    const oreoChocolate = document.getElementById("oreo-chocolate-ratio");

    if (oreoPackages && oreoYield) {
        oreoPackages.addEventListener("input", (e) => {
            const pkgs = parseFloat(e.target.value) || 0;
            oreoYield.value = Math.round(pkgs * 6);
            updateOreoWizardSuggestions();
        });

        oreoYield.addEventListener("input", (e) => {
            const yld = parseFloat(e.target.value) || 0;
            oreoPackages.value = (yld / 6).toFixed(2);
            updateOreoWizardSuggestions();
        });
    }

    if (oreoManjar) oreoManjar.addEventListener("input", updateOreoWizardSuggestions);
    if (oreoChocolate) oreoChocolate.addEventListener("input", updateOreoWizardSuggestions);

    // Apply wizard button
    const btnApply = document.getElementById("btn-apply-oreo-wizard");
    if (btnApply) {
        btnApply.addEventListener("click", applyOreoWizard);
    }
}

function updateOreoWizardSuggestions() {
    const yieldEl = document.getElementById("oreo-yield");
    const manjarEl = document.getElementById("oreo-manjar-ratio");
    const chocolateEl = document.getElementById("oreo-chocolate-ratio");
    const reqCookiesEl = document.getElementById("oreo-req-cookies");
    const reqPackagesEl = document.getElementById("oreo-req-packages");
    const reqManjarEl = document.getElementById("oreo-req-manjar");
    const reqChocolateEl = document.getElementById("oreo-req-chocolate");

    if (!yieldEl || !manjarEl || !chocolateEl) return;

    const yld = parseInt(yieldEl.value) || 0;
    const manjarPerU = parseFloat(manjarEl.value) || 0;
    const chocolatePerU = parseFloat(chocolateEl.value) || 0;

    const reqCookies = yld * 2;
    const reqPackages = (yld / 6).toFixed(1);
    const reqManjar = yld * manjarPerU;
    const reqChocolate = yld * chocolatePerU;

    if (reqCookiesEl) reqCookiesEl.textContent = reqCookies;
    if (reqPackagesEl) reqPackagesEl.textContent = reqPackages;
    if (reqManjarEl) reqManjarEl.textContent = `${reqManjar}g`;
    if (reqChocolateEl) reqChocolateEl.textContent = `${reqChocolate}g`;
}

function applyOreoWizard() {
    const yieldEl = document.getElementById("oreo-yield");
    const manjarEl = document.getElementById("oreo-manjar-ratio");
    const chocolateEl = document.getElementById("oreo-chocolate-ratio");

    if (!yieldEl || !manjarEl || !chocolateEl) return;

    const yld = parseInt(yieldEl.value);
    const manjarPerU = parseFloat(manjarEl.value);
    const chocolatePerU = parseFloat(chocolateEl.value);

    if (isNaN(yld) || yld <= 0) {
        alert("Por favor ingresa una cantidad válida de alfajores a producir.");
        return;
    }
    if (isNaN(manjarPerU) || manjarPerU < 0 || isNaN(chocolatePerU) || chocolatePerU < 0) {
        alert("Por favor ingresa cantidades válidas de manjar y chocolate.");
        return;
    }

    // 1. Find or create Oreo cookies ingredient
    let oreoIng = appState.ingredients.find(ing => ing.name.toLowerCase().includes("oreo"));
    if (!oreoIng) {
        // Create it
        oreoIng = {
            id: `ing-${Date.now()}`,
            name: "Galletas Oreo (Paquete 12 un)",
            category: "Ingrediente",
            unit: "un",
            price: 1200,
            size: 12
        };
        appState.ingredients.push(oreoIng);
        saveState();
        renderInventory();
    }

    // 2. Find manjar ingredient
    let manjarIng = appState.ingredients.find(ing => ing.name.toLowerCase().includes("manjar"));
    if (!manjarIng) {
        manjarIng = appState.ingredients.find(ing => ing.id === "ing-1") || appState.ingredients[0];
    }

    // 3. Find chocolate ingredient
    let chocolateIng = appState.ingredients.find(ing => ing.name.toLowerCase().includes("chocolate") || ing.name.toLowerCase().includes("cobertura"));
    if (!chocolateIng) {
        chocolateIng = appState.ingredients.find(ing => ing.id === "ing-3") || appState.ingredients[0];
    }

    // 4. Update currentRecipeIngredients
    currentRecipeIngredients = [];

    // Oreo Cookies (2 cookies per alfajor)
    currentRecipeIngredients.push({
        id: oreoIng.id,
        quantity: yld * 2
    });

    // Manjar
    if (manjarIng && manjarPerU > 0) {
        currentRecipeIngredients.push({
            id: manjarIng.id,
            quantity: yld * manjarPerU
        });
    }

    // Chocolate
    if (chocolateIng && chocolatePerU > 0) {
        currentRecipeIngredients.push({
            id: chocolateIng.id,
            quantity: yld * chocolatePerU
        });
    }

    // Set batch yield and name in form
    document.getElementById("recipe-yield").value = yld;
    document.getElementById("recipe-name").value = `Alfajores Oreo (Lote ${yld} un)`;

    // Recalculate
    updateRecipeBuilderOutput();

    alert(`¡Receta generada con éxito para ${yld} alfajores! Se añadieron las galletas, manjar y chocolate al lote. Puedes agregar empaques u otros ingredientes manualmente.`);
}

// 11. GLOBAL INITIALIZATION
window.addEventListener("DOMContentLoaded", () => {
    initAppState();
    setupTheme();
    setupTabs();
    resetTransactionDates();
    setupOreoWizard();

    // Render initially active tab (dashboard)
    renderDashboard();
});

// Helper for security
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
