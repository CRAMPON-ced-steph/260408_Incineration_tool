/* eslint-disable react/prop-types */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {ReactFlow, Controls, Background, Panel, useNodesState, useEdgesState, addEdge, getIncomers, getOutgoers, getConnectedEdges, useReactFlow} from '@xyflow/react';
import { Eraser } from './C_Components/EraserTool/Eraser';
import '@xyflow/react/dist/style.css';
import DropdownMenu from './C_Components/MenuDeroulant';
import { takeScreenshot } from './H_SaveAndLoad/screenshotUtils';
import Toggle10choice from './F_Gestion_Langues/togglechoice';

import {
  STACK_Parameter_Tab, IDFAN_Parameter_Tab, QUENCH_Parameter_Tab, WHB_Parameter_Tab,
  DENOX_Parameter_Tab, BHF_Parameter_Tab, IACT_Parameter_Tab, COOLINGTOWER_Parameter_Tab, ELECTROFILTER_Parameter_Tab,
  CYCLONE_Parameter_Tab, AIRINJECTION_Parameter_Tab, REACTOR_Parameter_Tab, RK_Parameter_Tab, SCRUBBER_Parameter_Tab,
  CO2_Parameter_Tab, GF_Parameter_Tab, FB_Parameter_Tab, WATER_INJECTION_Parameter_Tab,
  RKMainPage, FBMainPage, GFMainPage, WHBMainPage,
  CO2MainPage, QUENCHMainPage, CYCLONEMainPage, AIRINJECTIONMainPage, BHFMainPage, IACTMainPage, ELECTROFILTERMainPage,
  REACTORMainPage, DENOXMainPage, STACKMainPage, SCRUBBERMainPage, IDFANMainPage, COOLINGTOWERMainPage,
  WATER_INJECTIONMainPage,

 TUBEANDSHELLMainPage,
 TUBEANDSHELL_Parameter_Tab,
 
 
 SEP12MainPage,
 SEP21MainPage,

} from './C_Components/RetroAndBilanComponents';

import Sidebar from './C_Components/SidebarV1';
import OPEX_form from './OPEX';
import LinearGraph from './G_Graphiques/Combustion_diagramme/LinearGraph';
import DataFlowDisplay from './C_Components/DataFlowDisplay';
import AirParasiteDisplay from './C_Components/AirParasiteDisplay';
import DashboardWindow from './G_Graphiques/Dashboard/Dashboard';
import GlobalReport from './D_BILAN_Rapports/GlobalReport';
import GlobalRetroReport from './D_BILAN_Rapports/GlobalRetroReport';
import { batchCalcMap } from './Z_RETRO/batchCalculators';
import { BATCH_CALC_RESULT_EVENT } from './C_Components/useBatchCalcResult';
import CustomNode from './C_Components/CustomNode';

const initialNodes = [];
const initialEdges = [];
const nodeTypes = { custom: CustomNode };

const FURNACE_LABELS = ['RK+SCC', 'GF', 'FB'];

// Maps node labels to the localStorage key each Parameter_Tab uses for its calculationResult.
// nodeId suffix ensures multi-instance isolation.
const batchResultStorageKey = (label, nodeId) => {
  const baseKeys = {
    'RK+SCC': 'calculationResult_RK',
    FB: 'calculationResult_FB',
    GF: 'calculationResult_GF',
    WHB: 'calculationResult_WHB',
    QUENCH: 'calculationResult_QUENCH',
    DENOX: 'calculationResult_DENOX',
    BHF: 'CalculationResult_BHF',
    IACT: 'CalculationResult_IACT',
    COOLINGTOWER: 'calculationResult_COOLINGTOWER',
    ELECTROFILTER: 'CalculationResult_ELECTROFILTER',
    CYCLONE: 'CalculationResult_CYCLONE',
    REACTOR: 'calculationResult_REACTOR',
    SCRUBBER: 'calculationResult_SCRUBBER',
    STACK: 'calculationResult_STACK',
    IDFAN: 'calculationResult_IDFAN',
    WATER_INJECTION: 'calculationResult_WATER_INJECTION',
    AIRINJECTION: 'calculationResult_AIRINJECTION',
  };
  const base = baseKeys[label];
  return base ? `${base}_${nodeId}` : null;
};

// Union-Find helper: group nodes into process lines (connected components)
const buildProcessLines = (allNodes, edgeList) => {
  const allIds = new Set(allNodes.map(n => n.id));
  const parent = {};
  const find = (x) => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
  const union = (a, b) => { parent[find(a)] = find(b); };
  for (const n of allNodes) parent[n.id] = n.id;
  for (const e of edgeList) {
    if (allIds.has(e.source) && allIds.has(e.target)) union(e.source, e.target);
  }
  // Topological sort (Kahn)
  const adj = {}, inDeg = {};
  for (const n of allNodes) { adj[n.id] = []; inDeg[n.id] = 0; }
  for (const e of edgeList) {
    if (allIds.has(e.source) && allIds.has(e.target)) {
      adj[e.source].push(e.target);
      inDeg[e.target] = (inDeg[e.target] || 0) + 1;
    }
  }
  const topoOrder = [];
  const queue = allNodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);
    for (const next of (adj[id] || [])) { inDeg[next]--; if (inDeg[next] === 0) queue.push(next); }
  }
  for (const n of allNodes) { if (!topoOrder.includes(n.id)) topoOrder.push(n.id); }
  const topoRank = {};
  topoOrder.forEach((id, i) => { topoRank[id] = i; });

  const groups = {};
  for (const n of allNodes) {
    const root = find(n.id);
    if (!groups[root]) groups[root] = [];
    groups[root].push(n);
  }
  for (const root in groups) {
    groups[root].sort((a, b) => (topoRank[a.id] || 0) - (topoRank[b.id] || 0));
  }
  return Object.values(groups).sort((a, b) =>
    (topoRank[a[0]?.id] || 0) - (topoRank[b[0]?.id] || 0)
  );
};

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      className="fit-btn"
      onClick={() => fitView({ padding: 0.2, duration: 300 })}
      title="Fit canvas to window"
    >
      ⤢ Fit
    </button>
  );
}

function LockScrollButton() {
  const { fitView } = useReactFlow();
  const [locked, setLocked] = React.useState(false);

  const toggle = () => {
    const next = !locked;
    document.documentElement.style.overflow = next ? 'hidden' : '';
    document.body.style.overflow = next ? 'hidden' : '';
    if (next) fitView({ padding: 0.2, duration: 300 });
    setLocked(next);
  };

  return (
    <button
      className={`lock-btn${locked ? ' active' : ''}`}
      onClick={toggle}
      title={locked ? 'Restore scrollbars' : 'Hide scrollbars & fit view'}
    >
      {locked ? '⊠ Locked' : '⊡ Lock'}
    </button>
  );
}

function Flow({
  currentUser,
  adminEmail,
  onShowEmailManagement,
  onLogout
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [headNode, setHeadNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const { fitView } = useReactFlow();
  const isFirstRender = useRef(true);
  const nodeIdCounterRef = useRef(
    nodes.length > 0 ? Math.max(...nodes.map(n => parseInt(n.id, 10) || 0)) + 1 : 1
  );
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const id = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    return () => clearTimeout(id);
  }, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState(() => localStorage.getItem('mode') || 'Bilan');
  const [showDataFlowDisplay, setShowDataFlowDisplay] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showOPEX, setShowOPEX] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAirParasite, setShowAirParasite] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveProjectTitle, setSaveProjectTitle] = useState('');
  const [showLineNameModal, setShowLineNameModal] = useState(false);

  // Batch calculation state
  const [batchCalcIndex, setBatchCalcIndex] = useState(-1);
  const batchCalcIndexRef = useRef(-1);
  const [batchDoneCount, setBatchDoneCount] = useState(0);
  const [batchTotalCount, setBatchTotalCount] = useState(0);
  const [batchFinishedMsg, setBatchFinishedMsg] = useState(false);

  // Language management state
  const [currentLanguage, setCurrentLanguage] = useState(() => 
    localStorage.getItem('selectedLanguage') || 'fr'
  );
  
  // Fonction pour mettre à jour la langue
  const handleLanguageChange = useCallback((newLanguage) => {
    setCurrentLanguage(newLanguage);
    localStorage.setItem('selectedLanguage', newLanguage);
  }, []);

  const toggleOPEX = useCallback(() => {
    setShowOPEX(prevShowOPEX => !prevShowOPEX);
  }, []);

  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('mode', mode);
  }, [mode]);

  // Sauvegarde des positions originales avant réarrangement vertical
  const savedPositionsRef = useRef(null);

  useEffect(() => {
    if (showDataFlowDisplay) {
      // Sauvegarder les positions actuelles
      setNodes(prevNodes => {
        savedPositionsRef.current = prevNodes.map(n => ({ id: n.id, position: { ...n.position } }));
        // Réarranger en colonne verticale
        return prevNodes.map((node, index) => ({
          ...node,
          position: { x: 40, y: 20 + index * 90 },
        }));
      });
    } else if (savedPositionsRef.current) {
      // Restaurer les positions d'origine
      const saved = savedPositionsRef.current;
      savedPositionsRef.current = null;
      setNodes(prevNodes =>
        prevNodes.map(node => {
          const orig = saved.find(s => s.id === node.id);
          return orig ? { ...node, position: orig.position } : node;
        })
      );
    }
  }, [showDataFlowDisplay, setNodes]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prevMode) => (prevMode === 'Retro bilan' ? 'Bilan' : 'Retro bilan'));
  }, []);

  const onConnect = useCallback((params) => setEdges((els) => addEdge(params, els)), []);

  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((currentEdges) =>
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, nodes, currentEdges);
          const outgoers = getOutgoers(node, nodes, currentEdges);
          const connectedEdges = getConnectedEdges([node], currentEdges);

          const remainingEdges = acc.filter((edge) => !connectedEdges.includes(edge));
          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            }))
          );

          return [...remainingEdges, ...createdEdges];
        }, currentEdges)
      );
    },
    [nodes]
  );

  const NODE_COLORS = {
    // Four — rouge
    'RK+SCC': { background: '#e53935', color: '#fff' },
    'GF':     { background: '#e53935', color: '#fff' },
    'FB':     { background: '#e53935', color: '#fff' },
    // Récupération d'énergie — orange
    'WHB':             { background: '#fb8c00', color: '#fff' },
    'HX_TubeAndShell': { background: '#fb8c00', color: '#fff' },
    'IACT':            { background: '#fb8c00', color: '#fff' },
    // Traitement sec — gris foncé
    'BHF':          { background: '#757575', color: '#fff' },
    'ELECTROFILTER':{ background: '#757575', color: '#fff' },
    'CYCLONE':      { background: '#757575', color: '#fff' },
    'REACTOR':      { background: '#757575', color: '#fff' },
    'AIRINJECTION': { background: '#757575', color: '#fff' },
    // Traitement humide — bleu
    'QUENCH':          { background: '#1e88e5', color: '#fff' },
    'WATER_INJECTION': { background: '#1e88e5', color: '#fff' },
    'COOLINGTOWER':    { background: '#1e88e5', color: '#fff' },
    'DENOX':           { background: '#1e88e5', color: '#fff' },
    'SCRUBBER':        { background: '#1e88e5', color: '#fff' },
    // Échangeurs — rouge clair
    'Cooling_HX_air': { background: '#ffcdd2', color: '#000' },
    'Cooling_HX_eau': { background: '#ffcdd2', color: '#000' },
  };

  const onAddNode = useCallback(
    (label) => {
      const nodeStyle = NODE_COLORS[label] || {};
      const nodeId = nodeIdCounterRef.current++;
      const isFurnace = FURNACE_LABELS.includes(label);

      let position;
      if (!headNode || isFurnace) {
        const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), -100);
        position = { x: 0, y: maxY + 100 };
      } else {
        position = { x: headNode.position.x + 200, y: headNode.position.y };
      }

      const defaultStyle = { backgroundColor: '#fff', color: '#222', border: '1px solid #1a192b', borderRadius: '4px', padding: '10px 20px', fontSize: '12px', width: 150, textAlign: 'center' };
      const newNode = {
        id: `${nodeId}`,
        data: { label },
        position,
        type: 'custom',
        style: nodeStyle.background
          ? { ...defaultStyle, backgroundColor: nodeStyle.background, color: nodeStyle.color, border: '1px solid rgba(0,0,0,0.15)' }
          : defaultStyle,
      };
      setNodes((prevNodes) => [...prevNodes, newNode]);

      if (headNode && !isFurnace) {
        setEdges((prevEdges) => {
          let chainLength = 0;
          let currentId = headNode.id;
          while (true) {
            const upEdge = prevEdges.find(e => e.target === currentId);
            if (!upEdge) break;
            chainLength++;
            currentId = upEdge.source;
          }
          return [
            ...prevEdges,
            {
              id: `${headNode.id}-${newNode.id}`,
              source: headNode.id,
              target: newNode.id,
              label: (chainLength + 1).toString(),
              type: 'step',
            },
          ];
        });
      }

      setHeadNode(newNode);
    },
    [headNode, nodes, setNodes, setEdges]
  );

  // Kahn's algorithm — returns nodes in topological order (source → sink)
  const getTopologicalOrder = useCallback((nodesList, edgesList) => {
    const inDegree = {};
    const adj = {};
    nodesList.forEach(n => { inDegree[n.id] = 0; adj[n.id] = []; });
    edgesList.forEach(e => {
      if (adj[e.source] !== undefined) adj[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });
    const queue = nodesList.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      const node = nodesList.find(n => n.id === id);
      if (node) order.push(node);
      (adj[id] || []).forEach(targetId => {
        inDegree[targetId]--;
        if (inDegree[targetId] === 0) queue.push(targetId);
      });
    }
    return order;
  }, []);

  // Refs vers les dernières valeurs de nodes/edges, pour que onSendData reste STABLE
  // (ne pas dépendre de `nodes`/`edges`). Sinon onSendData se recrée à chaque setNodes,
  // ce qui recrée handleSendData dans les Parameter_Tab Retro et provoque une boucle de
  // recalcul (l'utilisateur se retrouve « bloqué » après un calcul).
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const onSendData = useCallback(
    (data) => {
      if (selectedNode) {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const targetNode = currentNodes.find((node) =>
          mode === 'Bilan'
            ? currentEdges.some((edge) => edge.source === selectedNode.id && edge.target === node.id)
            : currentEdges.some((edge) => edge.target === selectedNode.id && edge.source === node.id)
        );
  
        // Mise à jour du nœud cible avec les résultats
        if (targetNode) {
          setNodes((prevNodes) =>
            prevNodes.map((node) =>
              node.id === targetNode.id
                ? { ...node, data: { ...node.data, result: { ...data.result } } }
                : node
            )
          );
        }

        // Mise à jour du nœud sélectionné avec result + consommationElec
        const elecValue = data.result?.activeNodes_Elec?.[0]?.data?.consommationElec;
        const eauValue = data.result?.activeNodes_Eau?.[0]?.data?.consommationEau;
        const reactifsValue = data.result?.activeNodes_Reactifs?.[0]?.data?.consommationReactifs;
        const energieValue = data.result?.activeNodes_Energie?.[0]?.data?.consommationEnergie;
        const CO2Value = data.result?.activeNodes_CO2?.[0]?.data?.emissionsCO2;
        const coutValue = data.result?.activeNodes_cout?.[0]?.data?.cout;

        setNodes((prevNodes) =>
          prevNodes.map((node) =>
            node.id === selectedNode.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    result: { ...data.result },
                    ...(data.inputData !== undefined && { inputData: data.inputData }),
                    ...(elecValue !== undefined && { consommationElec: elecValue }),
                    ...(eauValue !== undefined && { consommationEau: eauValue }),
                    ...(reactifsValue !== undefined && { consommationReactifs: reactifsValue }),
                    ...(energieValue !== undefined && { consommationEnergie: energieValue }),
                    ...(CO2Value !== undefined && { emissionsCO2: CO2Value }),
                    ...(coutValue !== undefined && { cout: coutValue }),
                    isActive: true,
                  },
                }
              : node
          )
        );
      }
    },
    [selectedNode, mode, setNodes]
  );

  // BFS helper: starting from a node that just produced a result, propagate that result
  // upstream (Retro direction = Bilan source side) through any non-batch intermediate nodes
  // (CO2, DivConv, …) until reaching the next batch-calculable node. All traversed nodes
  // receive the result so the next batch node has fresh input when its turn arrives.
  const propagateResultUpstream = useCallback((startNodeId, result, allEdges, allNodes) => {
    const toUpdate = new Set();
    const queue = [startNodeId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      // Find all nodes whose Bilan-edge points TO currentId (= upstream in Retro)
      const upstreamIds = allEdges
        .filter(e => e.target === currentId)
        .map(e => e.source);
      for (const upId of upstreamIds) {
        if (toUpdate.has(upId)) continue;
        toUpdate.add(upId);
        const upNode = allNodes.find(n => n.id === upId);
        // If this upstream node is NOT a batch node, keep traversing through it
        if (upNode && !batchCalcMap[upNode.data.label]) {
          queue.push(upId);
        }
      }
    }
    return allNodes.map(n => {
      if (n.id === startNodeId) return { ...n, data: { ...n.data, result, isActive: true } };
      if (toUpdate.has(n.id)) return { ...n, data: { ...n.data, result } };
      return n;
    });
  }, []);

  // Batch calculation: direct async loop — calls calculation functions directly (no hidden components)
  const handleCalculateAll = useCallback(async () => {
    if (mode === 'Bilan') return;
    if (batchCalcIndexRef.current >= 0) return; // already running
    batchCalcIndexRef.current = 0; // lock immediately to prevent double-click

    const topoOrder = getTopologicalOrder(nodes, edges);
    const orderedNodes = [...topoOrder].reverse(); // Retro: STACK first, furnace last
    const filtered = orderedNodes.filter(n => batchCalcMap[n.data.label]);
    if (filtered.length === 0) { batchCalcIndexRef.current = -1; return; }

    setBatchDoneCount(0);
    setBatchTotalCount(filtered.length);
    setBatchFinishedMsg(false);

    const currentEdges = edges;
    // Local snapshot: propagate results immediately without waiting for React state commits
    let currentNodes = nodes;

    for (let i = 0; i < filtered.length; i++) {
      const node = filtered[i];
      batchCalcIndexRef.current = i;
      setBatchCalcIndex(i);

      // Read latest nodeData from local snapshot (always up-to-date)
      const nodeData = currentNodes.find(n => n.id === node.id)?.data || node.data;

      // Auto-détection WHB pour RK+SCC : synchroniser localStorage avant le calcul batch
      if (node.data.label === 'RK+SCC') {
        const hasWHB = currentNodes.some(n => n.data?.label === 'WHB');
        localStorage.setItem(`bilanType_whb_RK_${node.id}`, hasWHB ? 'WITH_WHB' : 'WITHOUT_WHB');
      }

      let result = null;
      try {
        result = batchCalcMap[node.data.label](nodeData, node.id);
      } catch (e) {
        console.error(`[Calc. All] Erreur pour ${node.data.label}:`, e);
      }

      if (result) {
        // BFS propagation: traverse through non-batch intermediates (CO2, DivConv, …)
        currentNodes = propagateResultUpstream(node.id, result, currentEdges, currentNodes);
        setNodes([...currentNodes]);

        const storageKey = batchResultStorageKey(node.data.label, node.id);
        if (storageKey) {
          try { localStorage.setItem(storageKey, JSON.stringify(result)); } catch {}
        }
        localStorage.setItem(`calcSent_${node.data.label}_${node.id}`, 'true');

        // Write pointE for furnace nodes when diagram mode is enabled (mirrors handleSendData in Parameter_Tabs)
        if (node.data.label === 'RK+SCC' && localStorage.getItem(`RK_diagramMode_${node.id}`) === 'YES') {
          localStorage.setItem(`pointE_${node.id}`, JSON.stringify({ x: result.MasseDechet || 0, y: result.P_incinerateur_MWH || 0, label: 'RK', nodeId: node.id }));
        } else if (node.data.label === 'FB' && localStorage.getItem(`FB_diagramMode_${node.id}`) === 'YES') {
          localStorage.setItem(`pointE_${node.id}`, JSON.stringify({ x: result.MasseDechet || 0, y: result.P_incinerateur_MWH || 0, label: 'FB', nodeId: node.id }));
        }

        // Notify any open Parameter_Tab so it can refresh its displayed result immediately
        window.dispatchEvent(new CustomEvent(BATCH_CALC_RESULT_EVENT, {
          detail: { nodeId: node.id, result }
        }));
      }

      setBatchDoneCount(i + 1);
      // Small yield so React can commit state updates and show progress
      await new Promise(r => setTimeout(r, 20));
    }

    batchCalcIndexRef.current = -1;
    setBatchCalcIndex(-1);
    setBatchFinishedMsg(true);
    setTimeout(() => setBatchFinishedMsg(false), 3000);
  }, [nodes, edges, mode, getTopologicalOrder, setNodes, propagateResultUpstream]);

  const renderParameterTab = () => {
    if (!selectedNode) return null;

    const componentMap = {
      ...(mode === 'Bilan' ? { 'RK+SCC': RKMainPage } : { 'RK+SCC': RK_Parameter_Tab }),
      ...(mode === 'Bilan' ? { FB: FBMainPage } : { FB: FB_Parameter_Tab }),
      ...(mode === 'Bilan' ? { GF: GFMainPage } : { GF: GF_Parameter_Tab }),
      ...(mode === 'Bilan' ? { WHB: WHBMainPage } : { WHB: WHB_Parameter_Tab }),
      ...(mode === 'Bilan' ? { CO2: CO2MainPage } : { CO2: CO2_Parameter_Tab }),
      ...(mode === 'Bilan' ? { QUENCH: QUENCHMainPage } : { QUENCH: QUENCH_Parameter_Tab }),
      ...(mode === 'Bilan' ? { CYCLONE: CYCLONEMainPage } : { CYCLONE: CYCLONE_Parameter_Tab }),
      ...(mode === 'Bilan' ? { AIRINJECTION: AIRINJECTIONMainPage } : { AIRINJECTION: AIRINJECTION_Parameter_Tab }),
      ...(mode === 'Bilan' ? { SCRUBBER: SCRUBBERMainPage } : { SCRUBBER: SCRUBBER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { BHF: BHFMainPage } : { BHF: BHF_Parameter_Tab }),
      ...(mode === 'Bilan' ? { IACT: IACTMainPage } : { IACT: IACT_Parameter_Tab }),
      ...(mode === 'Bilan' ? { ELECTROFILTER: ELECTROFILTERMainPage } : { ELECTROFILTER: ELECTROFILTER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { DENOX: DENOXMainPage } : { DENOX: DENOX_Parameter_Tab }),
      ...(mode === 'Bilan' ? { REACTOR: REACTORMainPage } : { REACTOR: REACTOR_Parameter_Tab }),
      ...(mode === 'Bilan' ? { STACK: STACKMainPage } : { STACK: STACK_Parameter_Tab }),
      ...(mode === 'Bilan' ? { IDFAN: IDFANMainPage } : { IDFAN: IDFAN_Parameter_Tab }),
      ...(mode === 'Bilan' ? { COOLINGTOWER: COOLINGTOWERMainPage } : { COOLINGTOWER: COOLINGTOWER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { WATER_INJECTION: WATER_INJECTIONMainPage } : { WATER_INJECTION: WATER_INJECTION_Parameter_Tab }),

      /*
      ...(mode === 'Bilan' ? { Cooling_HX_air: AIRCOOLERMainPage } : { Cooling_HX_air: AIRCOOLER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { Cooling_HX_eau: WATERCOOLERMainPage } : { Cooling_HX_eau: WATERCOOLER_Parameter_Tab }),
      ...(mode === 'Bilan' ? { HX_TubeAndShell: TUBEANDSHELLMainPage } : { HX_TubeAndShell: TUBEANDSHELL_Parameter_Tab }),
      
      ...(mode === 'Bilan' ? { '2to1': SEP21MainPage } : { '2to1': SEP21_Parameter_Tab }),
      ...(mode === 'Bilan' ? { '1to2': SEP12MainPage } : { '1to2': SEP12_Parameter_Tab }),
*/


      ...(mode === 'Bilan' ? { HX_TubeAndShell: TUBEANDSHELLMainPage } : { HX_TubeAndShell: TUBEANDSHELL_Parameter_Tab }),
      
      ...(mode === 'Bilan' ? { '2to1': SEP21MainPage } : {}),
      ...(mode === 'Bilan' ? { '1to2': SEP12MainPage } : {}),








    };

    const Component = componentMap[selectedNode.data.label];
    if (!Component) return null;

    return (
      <Component
        key={selectedNode.id}
        nodeId={selectedNode.id}
        title={selectedNode.data.label}
        nodeData={selectedNode.data}
        onSendData={onSendData}
        onGoBack={() => setSelectedNode(null)}
        onClose={() => setSelectedNode(null)}
        currentLanguage={currentLanguage}
        allNodes={nodes}
      />
    );
  };

  // Function to save the project
  const handleSaveProject = () => {
    setSaveProjectTitle('');
    setShowSaveDialog(true);
  };

  const confirmSaveProject = async () => {
    const projectData = { nodes, edges, selectedNode, mode, currentLanguage };
    const json = JSON.stringify(projectData, null, 2);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const safeName = saveProjectTitle.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_') || 'projet';
    const filename = `${yyyy}_${mm}_${dd}_${safeName}.json`;

    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
        setShowSaveDialog(false);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      // Fallback navigateurs sans File System Access API
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowSaveDialog(false);
    }
  };

  // Function to load the project
  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
   
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const projectData = JSON.parse(event.target.result);
            const defaultStyle = { backgroundColor: '#fff', color: '#222', border: '1px solid #1a192b', borderRadius: '4px', padding: '10px 20px', fontSize: '12px', width: 150, textAlign: 'center' };
            const restoredNodes = (projectData.nodes || []).map(n => {
              const nodeStyle = NODE_COLORS[n.data?.label] || {};
              return {
                ...n,
                type: 'custom',
                style: nodeStyle.background
                  ? { ...defaultStyle, backgroundColor: nodeStyle.background, color: nodeStyle.color, border: '1px solid rgba(0,0,0,0.15)' }
                  : { ...defaultStyle, ...(n.style || {}) },
              };
            });
            setNodes(restoredNodes);
            setEdges(projectData.edges || []);
            setSelectedNode(projectData.selectedNode);
            setMode(projectData.mode || 'Bilan');
            const maxId = restoredNodes.reduce((max, n) => Math.max(max, parseInt(n.id, 10) || 0), 0);
            nodeIdCounterRef.current = maxId + 1;
            
            // Load language from project if available
            if (projectData.currentLanguage) {
              setCurrentLanguage(projectData.currentLanguage);
              localStorage.setItem('selectedLanguage', projectData.currentLanguage);
            }
          } catch (error) {
            console.error('Error loading project:', error);
            alert('Error loading project file. Please ensure it is a valid project configuration.');
          }
        };
        reader.readAsText(file);
      }
    };
   
    input.click();
  };

  const handleScreenshot = useCallback(async () => {
    try {
      await takeScreenshot();
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  }, []);

  const [showRapportEditor, setShowRapportEditor] = useState(false);
  const [showRetroRapportEditor, setShowRetroRapportEditor] = useState(false);
  const handleEditRapport = useCallback(() => {
    if (mode === 'Bilan') {
      setShowRapportEditor(prev => !prev);
    } else {
      setShowRetroRapportEditor(prev => !prev);
    }
  }, [mode]);

  return (
    <>
    <div className="app-banner">
      <span>INCINERATION TOOL</span>
      <span className="app-banner-mode">{mode === 'Bilan' ? 'Bilan' : 'Rétro Bilan'}</span>
    </div>
    <div className="Zone-fond-blanc">
      <Sidebar onAddNode={onAddNode} currentLanguage={currentLanguage} />
      
      <DropdownMenu 
        currentUser={currentUser}
        adminEmail={adminEmail}
        mode={mode}
        showDataFlowDisplay={showDataFlowDisplay}
        showGraph={showGraph}
        showOPEX={showOPEX}
        onToggleMode={toggleMode}
        onToggleDataFlow={() => setShowDataFlowDisplay(!showDataFlowDisplay)}
        onToggleGraph={() => setShowGraph(!showGraph)}
        onShowAirParasite={() => setShowAirParasite(true)}
        onShowDashboard={() => setShowDashboard(true)}
        onShowEmailManagement={onShowEmailManagement}
        onToggleOPEX={toggleOPEX}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onLogout={onLogout}
        onScreenshot={handleScreenshot}
        onEditRapport={handleEditRapport}
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
      />

      <div
        className="relative-flex-container"
        style={showDataFlowDisplay ? { flex: '0 0 280px', minWidth: 0 } : {}}
      >
        <div className="btn-position">
          <Toggle10choice
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={isEraserActive ? undefined : onNodeClick}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="top-right"
          style={{ backgroundColor: '#F7F9FB' }}
        >
          <Background />
          <Controls />
          <Panel position="top-left">
            <button
              className="reset-btn"
              onClick={() => { if (window.confirm('Réinitialiser ? Toutes les données non sauvegardées seront perdues.')) window.location.reload(); }}
              title="Reset — recharge la page"
            >
              ↺ Reset
            </button>
            <button
              className={`eraser-btn${isEraserActive ? ' active' : ''}`}
              onClick={() => setIsEraserActive((v) => !v)}
            >
              🧹 Erase
            </button>
            <FitViewButton />
            <LockScrollButton />
            <button
              className="reset-btn"
              onClick={() => setShowLineNameModal(true)}
              title="Nommer les lignes de process"
            >
              🏷 Line Name
            </button>
            {mode !== 'Bilan' && (
              <>
                <button
                  className="reset-btn"
                  onClick={handleCalculateAll}
                  disabled={batchCalcIndex >= 0}
                  title="Calculer et envoyer données de tous les nœuds (STACK → four)"
                >
                  {batchCalcIndex >= 0
                    ? `⏳ ${batchDoneCount + 1}/${batchTotalCount}`
                    : '⚙ Calc. All'}
                </button>
                {batchFinishedMsg && (
                  <span style={{
                    fontSize: '12px', fontWeight: 600, color: '#16a34a',
                    background: '#dcfce7', border: '1px solid #86efac',
                    borderRadius: 12, padding: '3px 10px', whiteSpace: 'nowrap',
                  }}>
                    ✓ {batchTotalCount} nœuds calculés
                  </span>
                )}
              </>
            )}
          </Panel>
          {isEraserActive && <Eraser />}
        </ReactFlow>
      </div>

      {showDataFlowDisplay && (
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, height: '100%' }}>
          <DataFlowDisplay
            nodes={nodes}
            edges={edges}
            currentLanguage={currentLanguage}
            onClose={() => setShowDataFlowDisplay(false)}
          />
        </div>
      )}
      
      {showGraph && (
        <LinearGraph
          currentLanguage={currentLanguage}
          onClose={() => setShowGraph(false)}
          nodes={nodes}
        />
      )}
      
      {renderParameterTab()}
      
      {showAirParasite && (
        <AirParasiteDisplay
          onClose={() => setShowAirParasite(false)}
          nodes={nodes}
          edges={edges}
          currentLanguage={currentLanguage}
        />
      )}

      {showDashboard && (
        <DashboardWindow
          onClose={() => setShowDashboard(false)}
          nodes={nodes}
          edges={edges}
          currentLanguage={currentLanguage}
        />
      )}   

      {showOPEX && (
        <OPEX_form
          onClose={() => setShowOPEX(false)}
          currentLanguage={currentLanguage}
        />
      )}

      {showRapportEditor && (
        <GlobalReport
          nodes={nodes}
          edges={edges}
          currentLanguage={currentLanguage}
          onClose={() => setShowRapportEditor(false)}
        />
      )}

      {showRetroRapportEditor && (
        <GlobalRetroReport
          nodes={nodes}
          edges={edges}
          currentLanguage={currentLanguage}
          onClose={() => setShowRetroRapportEditor(false)}
        />
      )}

      {/* Modal Line Name */}
      {showLineNameModal && (() => {
        const lines = buildProcessLines(nodes, edges);
        return (
          <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          }}>
            <div style={{
              background: 'white', borderRadius: '8px', padding: '28px 32px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: '380px', maxWidth: '500px',
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1a3a6b' }}>
                Nommer les lignes de process
              </h3>
              {lines.length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px' }}>Aucune ligne détectée. Ajoutez un four pour créer une ligne.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {lines.map((line, i) => {
                    const furnaceNode = line.find(n => FURNACE_LABELS.includes(n.data?.label));
                    const firstNode = furnaceNode || line[0];
                    const chain = line.map(n => n.data.label).join(' → ');
                    return (
                      <div key={firstNode.id} style={{ border: '1px solid #e0e8f4', borderRadius: '6px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                          Ligne {i + 1} — {chain}
                        </div>
                        <input
                          type="text"
                          defaultValue={firstNode.data.lineName || ''}
                          placeholder={`Nom ligne ${i + 1}`}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            setNodes(nds => nds.map(n =>
                              n.id === firstNode.id
                                ? { ...n, data: { ...n.data, lineName: val || undefined } }
                                : n
                            ));
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                            border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                <button
                  onClick={() => setShowLineNameModal(false)}
                  style={{ padding: '7px 20px', border: 'none', borderRadius: '4px', background: '#1a3a6b', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal sauvegarde projet */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        }}>
          <div style={{
            background: 'white', borderRadius: '8px', padding: '28px 32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: '340px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1a3a6b' }}>
              Sauvegarder le projet
            </h3>
            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px' }}>
              Titre du projet
            </label>
            <input
              type="text"
              value={saveProjectTitle}
              onChange={(e) => setSaveProjectTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveProject(); if (e.key === 'Escape') setShowSaveDialog(false); }}
              placeholder="ex : four_RK_site_A"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px',
                marginBottom: '8px',
              }}
            />
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '18px' }}>
              {(() => {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const safe = saveProjectTitle.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_') || 'projet';
                return `Fichier : ${yyyy}_${mm}_${dd}_${safe}.json`;
              })()}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{ padding: '7px 16px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Annuler
              </button>
              <button
                onClick={confirmSaveProject}
                style={{ padding: '7px 16px', border: 'none', borderRadius: '4px', background: '#1a3a6b', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default Flow;


