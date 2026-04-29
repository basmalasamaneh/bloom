import React, { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiMapPin, FiDroplet, FiSun, FiWind, FiThermometer, FiCheck, FiPlus, FiAlertCircle, FiActivity, FiPackage, FiTruck, FiClock, FiInfo, FiCloud } from 'react-icons/fi';
import { FaLeaf, FaSeedling, FaChartLine } from 'react-icons/fa';
import Header from '../components/Header';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';
const AUTH_BASE = `${API_BASE}/auth`;
const CROPS_BASE = `${API_BASE}/crops`;
const TASKS_BASE = `${API_BASE}/tasks`;
const WEATHER_BASE = `${API_BASE}/weather/current`;
const ORDERS_BASE = `${API_BASE}/store/orders`;
const AI_BASE = `${API_BASE}/ai/chat`;

const Home = () => {
  const [currentDate, setCurrentDate] = useState('');
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [locationName, setLocationName] = useState('Fetching location...');
  const [locationLocked, setLocationLocked] = useState(false);
  const locationLockRef = useRef(false);
  const [user, setUser] = useState({
    id: null,
    name: 'Guest',
    city: '',
    village: '',
  });
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [activeCrops, setActiveCrops] = useState(0);
  const [dailyAdvice, setDailyAdvice] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState('water');
  const [selectedTaskPriority, setSelectedTaskPriority] = useState('medium');
  const [activeTab, setActiveTab] = useState('overview');
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [authToken, setAuthToken] = useState('');
  const [userLoaded, setUserLoaded] = useState(false);
  const [cropsData, setCropsData] = useState([]);
  
  // New state for orders
  const [orders, setOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  // Set current date
  useEffect(() => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(today.toLocaleDateString(undefined, options));
  }, []);

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    locationLockRef.current = locationLocked;
  }, [locationLocked]);

  // Get user location (only if user loaded and no profile location)
  useEffect(() => {
    if (!userLoaded || locationLocked) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          fetchLocationName(position.coords.latitude, position.coords.longitude);
          fetchWeather(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationName("Location unavailable");
          fetchWeather("28.6139,77.2090");
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setLocationName("Location unavailable");
      fetchWeather("28.6139,77.2090");
    }
  }, [locationLocked, userLoaded]);

  const mapStageToTaskType = (stage = '') => {
    const lowered = stage.toLowerCase();
    if (lowered.includes('harvest')) return 'harvest';
    if (lowered.includes('flower')) return 'fertilize';
    if (lowered.includes('veg')) return 'water';
    if (lowered.includes('seed') || lowered.includes('germ')) return 'water';
    return 'check';
  };

  const mapStageToPriority = (stage = '') => {
    const lowered = stage.toLowerCase();
    if (lowered.includes('harvest') || lowered.includes('flower')) return 'high';
    if (lowered.includes('veg') || lowered.includes('germ')) return 'medium';
    return 'low';
  };

  const mapBackendOrder = (order = {}) => {
    const items = Array.isArray(order.store_order_items)
      ? order.store_order_items.map((i) => ({
          name: i.store_items?.name || i.item_name || `Item #${i.item_id}`,
          quantity: i.quantity || 1,
          price: Number(i.price_each ?? i.price ?? 0),
        }))
      : Array.isArray(order.items)
      ? order.items
      : [];

    const total =
      typeof order.total_price === 'number'
        ? order.total_price
        : items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

    return {
      id: order.id || order.order_id,
      orderNumber: `Order #${order.id || order.order_id || ''}`.trim(),
      date: order.created_at
        ? new Date(order.created_at).toLocaleDateString()
        : order.date || '',
      status: order.status || 'pending',
      items,
      total,
      deliveryAddress: order.location || order.address || order.delivery_address || '—',
    };
  };

  const mapBackendSellerOrder = (order = {}) => {
    return {
      id: order.order_id || order.id,
      orderNumber: `Order #${order.order_id || order.id || ''}`.trim(),
      date: order.created_at
        ? new Date(order.created_at).toLocaleDateString()
        : order.date || '',
      status: order.status || 'pending',
      itemName: order.item_name || order.store_items?.name || `Item #${order.item_id}`,
      quantity: order.quantity || 1,
      price: Number(order.price_each ?? order.price ?? 0),
      buyer: order.buyer_id || order.user_id || '—',
      location: order.location || order.address || '—',
    };
  };

  const mapCropsToTasks = (crops = []) => {
    if (!Array.isArray(crops)) return [];

    return crops.map((crop) => {
      const rawProgress = typeof crop.progress === 'number' ? crop.progress : 0;
      const progress = Math.min(100, Math.max(0, rawProgress));
      const stageText = crop.stage || '';
      return {
        id: crop.id || Date.now(),
        task: crop.name || 'Crop task',
        description: `Task related to ${crop.name || 'crop'} at ${stageText || 'current stage'}`,
        type: mapStageToTaskType(stageText),
        completed: progress >= 100 || stageText.toLowerCase().includes('harvest'),
        priority: mapStageToPriority(stageText),
        progress,
      };
    });
  };

  const mapBackendTask = (task = {}) => {
    const title = task.title || task.task || 'Task';
    const type = task.type || 'check';
    const priority = task.priority || 'medium';
    const progress = typeof task.progress === 'number' ? task.progress : 0;
    const description = task.description || 'No description provided';

    return {
      id: task.id || task.task_id || Date.now(),
      task: title,
      description,
      type,
      completed: !!task.completed,
      priority,
      progress,
    };
  };

  const loadTasks = async (token) => {
    if (!token) return;
    try {
      const res = await fetch(TASKS_BASE, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      const mapped = Array.isArray(data) ? data.map(mapBackendTask) : [];
      setScheduleTasks(mapped);
    } catch (err) {
      console.error('Error loading tasks:', err);
      // For demo purposes, add some mock tasks if API fails
      setScheduleTasks([
        {
          id: 1,
          task: 'Water tomato plants',
          description: 'Check soil moisture and water tomato plants if top inch of soil is dry. Focus on watering the base of the plants to avoid leaf diseases.',
          type: 'water',
          completed: false,
          priority: 'high',
          progress: 75
        },
        {
          id: 2,
          task: 'Apply fertilizer',
          description: 'Apply balanced NPK fertilizer to vegetable beds. Use approximately 1 cup per 10 square feet, and water thoroughly after application.',
          type: 'fertilize',
          completed: false,
          priority: 'medium',
          progress: 50
        },
        {
          id: 3,
          task: 'Check for pests',
          description: 'Inspect leaves of all plants for signs of aphids, spider mites, or caterpillars. Pay special attention to the undersides of leaves.',
          type: 'check',
          completed: true,
          priority: 'low',
          progress: 100
        }
      ]);
    }
  };

  // New function to load orders
  const loadOrders = async (token, userId) => {
    if (!token || !userId) return;
    setLoadingOrders(true);
    const safeFetch = async (url) => {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          console.error(`Order fetch failed: ${res.status} ${url}`);
          return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error(`Order fetch error: ${url}`, err);
        return [];
      }
    };

    try {
      const [userOrders, sellerOrdersRes] = await Promise.all([
        safeFetch(`${ORDERS_BASE}/user/${userId}`),
        safeFetch(`${ORDERS_BASE}/seller/${userId}`),
      ]);
      setOrders(userOrders.map(mapBackendOrder));
      setSellerOrders(sellerOrdersRes.map(mapBackendSellerOrder));
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCropsForFarmer = async (farmerId, token) => {
    if (!farmerId) return;

    try {
      const res = await fetch(`${CROPS_BASE}/farmer/${farmerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error('Failed to fetch crops');
      }

      const crops = await res.json();
      setActiveCrops(Array.isArray(crops) ? crops.length : 0);
      setCropsData(Array.isArray(crops) ? crops : []);
    } catch (error) {
      console.error("Error fetching crops:", error);
    }
  };

  const loadUserAndData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLocationName("Location unavailable");
        setUserLoaded(true);
        return;
      }
      setAuthToken(token);

      const res = await fetch(`${AUTH_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setLocationName("Location unavailable");
        return;
      }

      const data = await res.json();
      const farmer = data?.farmer || data || {};

      setUser({
        id: farmer.id ?? null,
        name: farmer.name || 'User',
        city: farmer.city || '',
        village: farmer.village || '',
      });

      const resolvedLocation = farmer.city || farmer.village;
      if (resolvedLocation) {
        setLocationName(resolvedLocation);
        setLocationLocked(true);
        locationLockRef.current = true;
        fetchWeather(resolvedLocation);
      }

      if (farmer.id) {
        loadTasks(token);
        fetchCropsForFarmer(farmer.id, token);
        loadOrders(token, farmer.id); // Load orders when user data is loaded
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setLocationName("Location unavailable");
    } finally {
      setUserLoaded(true);
    }
  };

  // Fetch location name
  const fetchLocationName = async (lat, lon) => {
    try {
      setTimeout(() => {
        if (locationLockRef.current) return;
        const fallbackName = "Your Farm Location";
        setLocationName(prev => prev === 'Fetching location...' ? fallbackName : prev);
        fetchWeather(fallbackName);
      }, 1000);
    } catch (error) {
      console.error("Error fetching location name:", error);
      setLocationName("Unknown location");
    }
  };

  // Fetch weather data from backend (AccuWeather)
  const fetchWeather = async (locationString) => {
    if (!locationString) return;
    try {
      const res = await fetch(`${WEATHER_BASE}?q=${encodeURIComponent(locationString)}`);
      if (!res.ok) throw new Error('Failed to fetch weather');
      const data = await res.json();
      setWeather({
        temp: data.temperature_c,
        condition: data.conditions || 'Unknown',
        humidity: data.humidity ?? 0,
        windSpeed: data.wind_speed_kmh ?? 0,
        icon: data.icon || '01d',
        location: data.location || locationString,
      });
      if (data.location) {
        setLocationName(data.location);
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setWeather(null);
    }
  };

  // Set daily advice via AI
  useEffect(() => {
    if (!user.id || !weather) return;
    const cropDigest = cropsData
      .map((crop) => `${crop.name || "crop"} (${crop.stage || "stage unknown"})`)
      .join(", ");

    const loadAdvice = async () => {
      try {
        const prompt = `I grow the following crops: ${cropDigest || "various crops"}. The weather in ${
          weather.location || "my area"
        } is ${weather.condition || "unknown"} with ${weather.temp ?? "unknown"}AøC and ${
          weather.humidity ?? "unknown"
        }% humidity. Give me one concise actionable tip for today that matches the current conditions, include what to do and why, and keep it under three sentences.`;
        const res = await fetch(AI_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt })
        });
        if (!res.ok) throw new Error('AI request failed');
        const data = await res.json();
        setDailyAdvice(data.reply || 'Inspect your crops and adjust care based on current moisture.');
      } catch (err) {
        console.error('AI advice failed:', err);
        setDailyAdvice("Inspect your crops and adjust care based on current moisture.");
      }
    };
    loadAdvice();
  }, [weather, user.id, cropsData]);

  // Toggle task completion
  const toggleTaskCompletion = async (id) => {
    let nextCompleted = false;
    setScheduleTasks(prev => prev.map(task => {
      if (task.id === id) {
        nextCompleted = !task.completed;
        return { ...task, completed: nextCompleted };
      }
      return task;
    }));
    
    // Show notification
    setNotification({
      show: true,
      message: nextCompleted ? "Task completed! Great job!" : "Task marked as incomplete"
    });
    
    setTimeout(() => {
      setNotification({ show: false, message: '' });
    }, 3000);

    // Persist to backend
    if (authToken) {
      try {
        const res = await fetch(`${TASKS_BASE}/${id}/complete`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = mapBackendTask(data);
          setScheduleTasks(prev => prev.map(t => t.id === id ? mapped : t));
        } else {
          console.error("Complete task failed:", res.status);
        }
      } catch (err) {
        console.error("Error completing task:", err);
      }
    }
  };

  // Add new task
  const addTask = async () => {
    if (!newTask.trim()) return;

    const optimisticTask = {
      id: Date.now(),
      task: newTask,
      description: newTaskDescription || newTask || 'No description provided',
      type: newTaskType,
      priority: selectedTaskPriority,
      completed: false,
      progress: 0
    };

    try {
      setScheduleTasks(prev => [...prev, optimisticTask]);
      setNewTask('');
      setNewTaskDescription('');
      setShowAddTask(false);

      if (authToken) {
        const res = await fetch(TASKS_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            title: newTask,
            description: newTaskDescription || newTask,
            type: newTaskType,
            priority: selectedTaskPriority,
            progress: 0
          })
        });

        if (res.ok) {
          const data = await res.json();
          const mapped = mapBackendTask(data);
          setScheduleTasks(prev =>
            prev.map(t => (t.id === optimisticTask.id ? mapped : t))
          );
        }
      }

      setNotification({
        show: true,
        message: "New task added successfully!"
      });

      setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 3000);
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  // Function to check if it's cloudy
  const isCloudy = () => {
    if (!weather || !weather.condition) return false;
    const condition = weather.condition.toLowerCase();
    return condition.includes('cloud') || 
           condition.includes('overcast') || 
           condition.includes('fog') || 
           condition.includes('mist') ||
           condition.includes('haze');
  };

  // Get weather icon based on condition
  const getWeatherIcon = () => {
    if (!weather) return <FiSun className="weather-icon" />;
    
    const condition = weather.condition.toLowerCase();
    
    if (condition.includes('cloud') || condition.includes('overcast') || 
        condition.includes('fog') || condition.includes('mist') || 
        condition.includes('haze')) {
      return <FiCloud className="weather-icon" />;
    } else if (condition.includes('rain') || condition.includes('shower') || 
               condition.includes('storm') || condition.includes('thunder')) {
      return <FiDroplet className="weather-icon" />;
    } else {
      return <FiSun className="weather-icon" />;
    }
  };

  // Get task icon
  const getTaskIcon = (type) => {
    switch(type) {
      case 'water':
        return <FiDroplet className="task-icon water" />;
      case 'fertilize':
        return <FaSeedling className="task-icon fertilize" />;
      case 'harvest':
        return <FaLeaf className="task-icon harvest" />;
      case 'check':
        return <FiAlertCircle className="task-icon check" />;
      default:
        return <FiCheck className="task-icon" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high':
        return '#F4D6CC'; // Soft Pink
      case 'medium':
        return '#F2C94C'; // Bloom Yellow
      case 'low':
        return '#6FCF97'; // Fresh Leaf Green
      default:
        return '#8B5E3C'; // Earth Brown
    }
  };

  // Get status color for orders
  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered':
        return '#6FCF97'; // Fresh Leaf Green
      case 'in-transit':
        return '#F2C94C'; // Bloom Yellow
      case 'processing':
        return '#A3D8F4'; // Sky Blue
      case 'cancelled':
        return '#F4D6CC'; // Soft Pink
      default:
        return '#8B5E3C'; // Earth Brown
    }
  };

  // Get status icon for orders
  const getStatusIcon = (status) => {
    switch(status) {
      case 'delivered':
        return <FiCheck className="status-icon" />;
      case 'in-transit':
        return <FiTruck className="status-icon" />;
      case 'processing':
        return <FiClock className="status-icon" />;
      case 'cancelled':
        return <FiAlertCircle className="status-icon" />;
      default:
        return <FiPackage className="status-icon" />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .home-container {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background: #FAF9F6;
        }
        
        .animated-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }
        
        .wave {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100px;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%232E8B57' fill-opacity='0.3' d='M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,133.3C960,128,1056,96,1152,90.7C1248,85,1344,107,1392,117.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E");
          background-size: cover;
          animation: wave 10s linear infinite;
        }
        
        .wave:nth-child(2) {
          bottom: 10px;
          opacity: 0.5;
          animation: wave 15s linear infinite reverse;
        }
        
        .wave:nth-child(3) {
          bottom: 20px;
          opacity: 0.2;
          animation: wave 20s linear infinite;
        }
        
        @keyframes wave {
          0% { background-position-x: 0; }
          100% { background-position-x: 1440px; }
        }
        
        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
        }
        
        /* Flower Styles */
        .flower {
          position: absolute;
          opacity: 0.15;
          animation: float 15s infinite ease-in-out;
        }
        
        .flower-center {
          position: absolute;
          width: 30px;
          height: 30px;
          background: #F2C94C;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        
        .petal {
          position: absolute;
          width: 40px;
          height: 40px;
          background: linear-gradient(45deg, #F4D6CC, #F2C94C);
          border-radius: 0 50% 0 50%;
          top: 50%;
          left: 50%;
          transform-origin: 0 0;
        }
        
        .petal:nth-child(1) { transform: rotate(0deg) translate(-50%, -50%); }
        .petal:nth-child(2) { transform: rotate(72deg) translate(-50%, -50%); }
        .petal:nth-child(3) { transform: rotate(144deg) translate(-50%, -50%); }
        .petal:nth-child(4) { transform: rotate(216deg) translate(-50%, -50%); }
        .petal:nth-child(5) { transform: rotate(288deg) translate(-50%, -50%); }
        
        .flower-1 {
          width: 100px;
          height: 100px;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }
        
        .flower-2 {
          width: 120px;
          height: 120px;
          top: 70%;
          right: 10%;
          animation-delay: 2s;
        }
        
        /* Leaf Styles */
        .leaf {
          position: absolute;
          opacity: 0.12;
          animation: float 18s infinite ease-in-out;
        }
        
        .leaf-shape {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #6FCF97, #2E8B57);
          border-radius: 0 100% 0 100%;
          position: relative;
          transform: rotate(45deg);
        }
        
        .leaf-shape::before {
          content: '';
          position: absolute;
          width: 2px;
          height: 40px;
          background: #1B4332;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
        }
        
        .leaf-1 {
          width: 80px;
          height: 80px;
          top: 40%;
          left: 80%;
          animation-delay: 4s;
        }
        
        .leaf-2 {
          width: 100px;
          height: 100px;
          top: 20%;
          right: 30%;
          animation-delay: 6s;
        }
        
        /* Alternative Flower Style */
        .flower-alt {
          position: absolute;
          opacity: 0.1;
          animation: float 20s infinite ease-in-out;
        }
        
        .flower-alt-center {
          position: absolute;
          width: 25px;
          height: 25px;
          background: #8B5E3C;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        
        .petal-alt {
          position: absolute;
          width: 35px;
          height: 35px;
          background: linear-gradient(45deg, #A3D8F4, #6FCF97);
          border-radius: 50% 50% 50% 0;
          top: 50%;
          left: 50%;
          transform-origin: 0 100%;
        }
        
        .petal-alt:nth-child(1) { transform: rotate(0deg) translate(-50%, -50%); }
        .petal-alt:nth-child(2) { transform: rotate(90deg) translate(-50%, -50%); }
        .petal-alt:nth-child(3) { transform: rotate(180deg) translate(-50%, -50%); }
        .petal-alt:nth-child(4) { transform: rotate(270deg) translate(-50%, -50%); }
        
        .flower-alt-1 {
          width: 90px;
          height: 90px;
          top: 60%;
          left: 5%;
          animation-delay: 8s;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(5deg); }
          66% { transform: translateY(20px) rotate(-5deg); }
        }
        
        .content-wrapper {
          position: relative;
          z-index: 1;
          padding: -2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .date-location {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem 2rem;
          background: #E8F3E8;
          backdrop-filter: blur(10px);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          animation: slideUp 0.5s ease-out 0.2s both;
        }
        
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .date {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333333;
          display: flex;
          align-items: center;
        }
        
        .date-icon {
          margin-right: 0.75rem;
          color: #F2C94C;
          font-size: 1.8rem;
        }
        
        .location {
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          color: #333333;
        }
        
        .location-icon {
          margin-right: 0.75rem;
          color: #F2C94C;
          font-size: 1.4rem;
        }
        
        .tabs-container {
          display: flex;
          margin-bottom: 2rem;
          background: #E8F3E8;
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 0.5rem;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          animation: slideUp 0.5s ease-out 0.4s both;
        }
        
        .tab {
          flex: 1;
          padding: 1rem;
          text-align: center;
          color: #333333;
          font-weight: 600;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .tab::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: -1;
        }
        
        .tab.active::before {
          opacity: 1;
        }
        
        .tab.active {
          color: #FFFFFF;
        }
        
        .tab:hover {
          transform: translateY(-3px);
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }
        
        .card {
          background: #FFFFFF;
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          border: 1px solid rgba(46, 139, 87, 0.2);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.5s ease-out;
        }
        
        .card:nth-child(1) { animation-delay: 0.6s; }
        .card:nth-child(2) { animation-delay: 0.8s; }
        .card:nth-child(3) { animation-delay: 1s; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 5px;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(46, 139, 87, 0.2);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333333;
        }
        
        .weather-card {
          grid-column: span 2;
        }
        
        .weather-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .weather-temp-container {
          display: flex;
          align-items: baseline;
        }
        
        .weather-temp {
          font-size: 4rem;
          font-weight: 800;
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .weather-unit {
          font-size: 2rem;
          color: #333333;
          margin-left: 0.5rem;
        }
        
        .weather-condition {
          font-size: 1.2rem;
          color: #333333;
          margin-top: 0.5rem;
        }
        
        .weather-icon-container {
          position: relative;
        }
        
        .weather-icon {
          font-size: 5rem;
          color: #F2C94C;
          filter: drop-shadow(0 5px 15px rgba(242, 201, 76, 0.3));
          animation: float 3s ease-in-out infinite;
        }
        
        .weather-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1.5rem;
        }
        
        .weather-detail {
          text-align: center;
          padding: 1rem;
          background: rgba(46, 139, 87, 0.1);
          border-radius: 15px;
          transition: all 0.3s ease;
        }
        
        .weather-detail:hover {
          background: rgba(46, 139, 87, 0.2);
          transform: translateY(-3px);
        }
        
        .weather-detail-icon {
          font-size: 1.8rem;
          color: #2E8B57;
          margin-bottom: 0.5rem;
        }
        
        .weather-detail-value {
          font-size: 1.2rem;
          font-weight: 600;
          color: #333333;
        }
        
        .weather-detail-label {
          font-size: 0.9rem;
          color: #4F6F52;
          margin-top: 0.25rem;
        }
        
        .schedule-card {
          max-height: 500px;
          overflow-y: auto;
        }
        
        .schedule-card::-webkit-scrollbar {
          width: 6px;
        }
        
        .schedule-card::-webkit-scrollbar-track {
          background: rgba(46, 139, 87, 0.1);
          border-radius: 10px;
        }
        
        .schedule-card::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          border-radius: 10px;
        }
        
        .add-task-btn {
          background: #2E8B57;
          border: none;
          color: #FFFFFF;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0.75rem 1.5rem;
          border-radius: 50px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(46, 139, 87, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .add-task-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .add-task-btn:hover::before {
          left: 100%;
        }
        
        .add-task-btn:hover {
          background: #6FCF97;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(46, 139, 87, 0.4);
        }
        
        .add-task-icon {
          margin-right: 0.5rem;
        }
        
        .task-list {
          list-style: none;
          padding: 0;
        }
        
        .task-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          margin-bottom: 1rem;
          background: rgba(46, 139, 87, 0.1);
          border-radius: 15px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
          position: relative;
          overflow: hidden;
        }
        
        .task-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(46, 139, 87, 0.2), transparent);
          transition: left 0.5s;
        }
        
        .task-item:hover::before {
          left: 100%;
        }
        
        .task-item:hover {
          background: rgba(46, 139, 87, 0.2);
          transform: translateX(5px);
        }
        
        .task-item.high-priority {
          border-left-color: #F4D6CC;
        }
        
        .task-item.medium-priority {
          border-left-color: #F2C94C;
        }
        
        .task-item.low-priority {
          border-left-color: #6FCF97;
        }

        .task-item.expanded {
          transform: scale(1.02);
          z-index: 10;
          box-shadow: 0 15px 40px rgba(46, 139, 87, 0.25);
        }
        
        .task-checkbox {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #2E8B57;
          margin-right: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          position: relative;
          z-index: 2;
        }
        
        .task-checkbox:hover {
          border-color: #6FCF97;
        }
        
        .task-checkbox.checked {
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          border-color: #2E8B57;
        }
        
        .task-checkbox.checked .check-icon {
          color: white;
        }
        
        .task-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }
        
        .task-text {
          font-size: 1rem;
          color: #333333;
          margin-bottom: 0.25rem;
        }
        
        .task-text.completed {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        .task-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.85rem;
          color: #4F6F52;
        }
        
        .task-priority {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 50px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #333333;
        }
        
        .task-progress {
          flex: 1;
          height: 6px;
          background: rgba(46, 139, 87, 0.2);
          border-radius: 3px;
          margin-top: 0.5rem;
          overflow: hidden;
        }
        
        .task-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #2E8B57, #6FCF97);
          border-radius: 3px;
          transition: width 0.5s ease;
        }
        
        .task-icon {
          font-size: 1.2rem;
          margin-right: 1rem;
        }
        
        .task-icon.water {
          color: #A3D8F4;
        }
        
        .task-icon.fertilize {
          color: #6FCF97;
        }
        
        .task-icon.harvest {
          color: #F2C94C;
        }
        
        .task-icon.check {
          color: #F4D6CC;
        }
        
        /* Inline task description */
        .task-description-inline {
          margin-top: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(46, 139, 87, 0.08);
          border-radius: 12px;
          font-size: 0.95rem;
          color: #2E8B57;
          line-height: 1.5;
        }
        
        .add-task-form {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background: rgba(46, 139, 87, 0.1);
          border-radius: 15px;
          border: 2px dashed rgba(46, 139, 87, 0.3);
        }
        
        .task-input-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .task-input {
          padding: 1rem;
          border-radius: 10px;
          border: 2px solid rgba(46, 139, 87, 0.2);
          background: white;
          color: #333333;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }
        
        .task-input:focus {
          border-color: #2E8B57;
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }
        
        .task-input::placeholder {
          color: rgba(51, 51, 51, 0.5);
        }
        
        .task-textarea {
          min-height: 80px;
          resize: vertical;
          font-family: 'Poppins', sans-serif;
        }
        
        .task-select-group {
          display: flex;
          gap: 1rem;
        }
        
        .task-select {
          flex: 1;
          padding: 1rem;
          border-radius: 10px;
          border: 2px solid rgba(46, 139, 87, 0.2);
          background: white;
          color: #333333;
          font-size: 1rem;
          outline: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .task-select:focus {
          border-color: #2E8B57;
          box-shadow: 0 0 0 3px rgba(46, 139, 87, 0.1);
        }
        
        .task-form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .task-form-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .task-form-btn.save {
          background: #2E8B57;
          color: #FFFFFF;
          box-shadow: 0 4px 15px rgba(46, 139, 87, 0.3);
        }
        
        .task-form-btn.save:hover {
          background: #6FCF97;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(46, 139, 87, 0.4);
        }
        
        .task-form-btn.cancel {
          background: transparent;
          color: #333333;
          border: 2px solid rgba(51, 51, 51, 0.3);
        }
        
        .task-form-btn.cancel:hover {
          background: rgba(51, 51, 51, 0.1);
        }
        
        .advice-card {
          background: linear-gradient(135deg, rgba(242, 201, 76, 0.2), rgba(46, 139, 87, 0.2));
        }
        
        .advice-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .advice-icon {
          font-size: 2rem;
          color: #F2C94C;
          margin-right: 1rem;
          animation: pulse 2s infinite;
        }
        
        .advice-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333333;
        }
        
        .advice-content {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #4F6F52;
          font-style: italic;
        }
        
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 1.5rem;
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          color: #FFFFFF;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.3);
          transform: translateX(400px);
          transition: transform 0.3s ease;
          z-index: 1000;
        }
        
        .notification.show {
          transform: translateX(0);
        }
        
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: #FFFFFF;
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(46, 139, 87, 0.15);
          text-align: center;
          transition: all 0.3s ease;
          animation: fadeIn 0.5s ease-out;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(46, 139, 87, 0.2);
        }
        
        .stat-icon {
          font-size: 2rem;
          color: #2E8B57;
          margin-bottom: 1rem;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #333333;
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #4F6F52;
        }
        
        /* Orders Styles */
        .orders-card {
          max-height: 500px;
          overflow-y: auto;
        }
        
        .orders-card::-webkit-scrollbar {
          width: 6px;
        }
        
        .orders-card::-webkit-scrollbar-track {
          background: rgba(46, 139, 87, 0.1);
          border-radius: 10px;
        }
        
        .orders-card::-webkit-scrollbar-thumb {
          background: linear-gradient(45deg, #2E8B57, #6FCF97);
          border-radius: 10px;
        }
        
        .orders-list {
          list-style: none;
          padding: 0;
        }
        
        .order-item {
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: rgba(46, 139, 87, 0.05);
          border-radius: 15px;
          transition: all 0.3s ease;
          border-left: 4px solid transparent;
          position: relative;
          overflow: hidden;
        }
        
        .order-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(46, 139, 87, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .order-item:hover::before {
          left: 100%;
        }
        
        .order-item:hover {
          background: rgba(46, 139, 87, 0.1);
          transform: translateX(5px);
        }
        
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .order-number {
          font-size: 1.2rem;
          font-weight: 600;
          color: #333333;
        }
        
        .order-date {
          font-size: 0.9rem;
          color: #4F6F52;
        }
        
        .order-status {
          display: flex;
          align-items: center;
          padding: 0.4rem 0.8rem;
          border-radius: 50px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #333333;
        }
        
        .status-icon {
          margin-right: 0.5rem;
          font-size: 1rem;
        }
        
        .order-items {
          margin-bottom: 1rem;
        }
        
        .order-item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
        }
        
        .order-item-name {
          color: #333333;
        }
        
        .order-item-price {
          color: #4F6F52;
        }
        
        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid rgba(46, 139, 87, 0.2);
        }
        
        .order-total {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333333;
        }
        
        .order-address {
          font-size: 0.9rem;
          color: #4F6F52;
          display: flex;
          align-items: center;
        }
        
        .order-address-icon {
          margin-right: 0.5rem;
          color: #2E8B57;
        }
        
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          color: #4F6F52;
        }
        
        .no-orders {
          text-align: center;
          padding: 2rem;
          color: #4F6F52;
        }
        
        .no-orders-icon {
          font-size: 3rem;
            margin-bottom: 1rem;
            color: #2E8B57;
            opacity: 0.7;
        }
        
        @media (max-width: 768px) {
          .content-wrapper {
            padding: 1rem;
          }
          
          .date-location {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .weather-card {
            grid-column: span 1;
          }
          
          .weather-main {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .weather-temp {
            font-size: 3rem;
          }
          
          .weather-details {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .stats-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      
      <div className="home-container">
        <div className="animated-bg">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
        
        <div className="floating-elements">
          {/* Flowers */}
          <div className="flower flower-1">
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="flower-center"></div>
          </div>
          
          <div className="flower flower-2">
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="petal"></div>
            <div className="flower-center"></div>
          </div>
          
          {/* Leaves */}
          <div className="leaf leaf-1">
            <div className="leaf-shape"></div>
          </div>
          
          <div className="leaf leaf-2">
            <div className="leaf-shape"></div>
          </div>
          
          {/* Alternative Flower */}
          <div className="flower-alt flower-alt-1">
            <div className="petal-alt"></div>
            <div className="petal-alt"></div>
            <div className="petal-alt"></div>
            <div className="petal-alt"></div>
            <div className="flower-alt-center"></div>
          </div>
        </div>
        
        <div className="content-wrapper">
          <Header />
          
          {/* Date and Location */}
          <div className="date-location">
            <div className="date">
              <FiCalendar className="date-icon" />
              {currentDate}
            </div>
            <div className="location">
              <FiMapPin className="location-icon" />
              {locationName}
            </div>
          </div>
          
          {/* Tabs - Removed Analytics, Added Orders */}
          <div className="tabs-container">
            <div className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              Overview
            </div>
            <div className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
              Tasks
            </div>
            <div className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              Orders
            </div>
          </div>
          
          {/* Stats Container - Removed Soil Moisture and Temperature cards */}
          <div className="stats-container">
            <div className="stat-card">
              <FiActivity className="stat-icon" />
              <div className="stat-value">{scheduleTasks.filter(t => t.completed).length}/{scheduleTasks.length}</div>
              <div className="stat-label">Tasks Completed</div>
            </div>
            <div className="stat-card">
              <FaLeaf className="stat-icon" />
              <div className="stat-value">{activeCrops}</div>
              <div className="stat-label">Active Crops</div>
            </div>
          </div>
          
          {/* Dashboard Grid */}
          {activeTab === 'overview' && (
            <div className="dashboard-grid">
              {/* Weather Card */}
              <div className="card weather-card">
                <div className="card-header">
                  <h2 className="card-title">Today's Weather</h2>
                </div>
                {weather ? (
                  <>
                    <div className="weather-main">
                      <div>
                        <div className="weather-temp-container">
                          <div className="weather-temp">{weather.temp}</div>
                          <div className="weather-unit">°C</div>
                        </div>
                        <div className="weather-condition">{weather.condition}</div>
                      </div>
                      <div className="weather-icon-container">
                        {getWeatherIcon()}
                      </div>
                    </div>
                    <div className="weather-details">
                      <div className="weather-detail">
                        <FiDroplet className="weather-detail-icon" />
                        <div className="weather-detail-value">{weather.humidity}%</div>
                        <div className="weather-detail-label">Humidity</div>
                      </div>
                      <div className="weather-detail">
                        <FiWind className="weather-detail-icon" />
                        <div className="weather-detail-value">{weather.windSpeed} km/h</div>
                        <div className="weather-detail-label">Wind Speed</div>
                      </div>
                      <div className="weather-detail">
                        <FiCloud className="weather-detail-icon" />
                        <div className="weather-detail-value">{isCloudy() ? 'Cloudy' : 'Clear'}</div>
                        <div className="weather-detail-label">Sky Condition</div>
                      </div>
                      <div className="weather-detail">
                        <FiSun className="weather-detail-icon" />
                        <div className="weather-detail-value">{weather.sunrise || '6:30 AM'}</div>
                        <div className="weather-detail-label">Sunrise</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>Loading weather data...</div>
                )}
              </div>
              
              {/* Daily Advice Card */}
              <div className="card advice-card">
                <div className="advice-header">
                  <FiSun className="advice-icon" />
                  <h2 className="advice-title">Today's Farming Tip</h2>
                </div>
                <p className="advice-content">
                  {dailyAdvice}
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'tasks' && (
            <div className="dashboard-grid">
              {/* Daily Schedule Card */}
              <div className="card schedule-card">
                <div className="card-header">
                  <h2 className="card-title">Today's Schedule</h2>
                  <button className="add-task-btn" onClick={() => setShowAddTask(!showAddTask)}>
                    <FiPlus className="add-task-icon" /> Add Task
                  </button>
                </div>
                
                {showAddTask && (
                  <div className="add-task-form">
                    <div className="task-input-group">
                      <input
                        type="text"
                        className="task-input"
                        placeholder="Enter a new task"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                      />
                      <textarea
                        className="task-input task-textarea"
                        placeholder="Add a description for this task (optional)"
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                      />
                      <div className="task-select-group">
                        <select
                          className="task-select"
                          value={newTaskType}
                          onChange={(e) => setNewTaskType(e.target.value)}
                        >
                          <option value="water">Water</option>
                          <option value="fertilize">Fertilize</option>
                          <option value="harvest">Harvest</option>
                          <option value="check">Check</option>
                        </select>
                        <select
                          className="task-select"
                          value={selectedTaskPriority}
                          onChange={(e) => setSelectedTaskPriority(e.target.value)}
                        >
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>
                      </div>
                    </div>
                    <div className="task-form-buttons">
                      <button className="task-form-btn cancel" onClick={() => {
                        setShowAddTask(false);
                        setNewTask('');
                        setNewTaskDescription('');
                      }}>
                        Cancel
                      </button>
                      <button className="task-form-btn save" onClick={addTask}>
                        Add Task
                      </button>
                    </div>
                  </div>
                )}
                
                <ul className="task-list">
                  {scheduleTasks.map(task => (
                    <li 
                      key={task.id} 
                      className={`task-item ${task.priority}-priority`}
                    >
                      <div 
                        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                        onClick={() => toggleTaskCompletion(task.id)}
                      >
                        {task.completed && <FiCheck className="check-icon" />}
                      </div>
                      {getTaskIcon(task.type)}
                      <div className="task-content">
                        <div className={`task-text ${task.completed ? 'completed' : ''}`}>
                          {task.task}
                        </div>
                        <div className="task-meta">
                          <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="task-progress">
                          <div className="task-progress-bar" style={{ width: `${task.progress}%` }}></div>
                        </div>
                        <div className="task-description-inline">
                          {task.description || 'No description provided for this task.'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* New Orders Tab */}
          {activeTab === 'orders' && (
            <div className="dashboard-grid">
              <div className="card orders-card">
                <div className="card-header">
                  <h2 className="card-title"> MY Orders</h2>
                </div>
                
                {loadingOrders ? (
                  <div className="loading-container">
                    <div>Loading your orders...</div>
                  </div>
                ) : orders.length > 0 ? (
                  <ul className="orders-list">
                    {orders.map(order => (
                      <li key={order.id} className="order-item" style={{ borderLeftColor: getStatusColor(order.status) }}>
                        <div className="order-header">
                          <div>
                            <div className="order-number">{order.orderNumber}</div>
                            <div className="order-date">{order.date}</div>
                          </div>
                          <div 
                            className="order-status" 
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                          </div>
                        </div>
                        
                        <div className="order-items">
                          {order.items.map((item, index) => (
                            <div key={index} className="order-item-row">
                              <span className="order-item-name">{item.name} x {item.quantity}</span>
                              <span className="order-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="order-footer">
                          <div className="order-total">Total: ${order.total.toFixed(2)}</div>
                          <div className="order-address">
                            <FiMapPin className="order-address-icon" />
                            {order.deliveryAddress}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-orders">
                    <FiPackage className="no-orders-icon" />
                    <p>You don't have any orders yet.</p>
                  </div>
                )}
              </div>

              <div className="card orders-card">
                <div className="card-header">
                  <h2 className="card-title">Orders On My Items</h2>
                </div>

                {loadingOrders ? (
                  <div className="loading-container">
                    <div>Loading orders on your items...</div>
                  </div>
                ) : sellerOrders.length > 0 ? (
                  <ul className="orders-list">
                    {sellerOrders.map(order => (
                      <li key={order.id} className="order-item" style={{ borderLeftColor: getStatusColor(order.status) }}>
                        <div className="order-header">
                          <div>
                            <div className="order-number">{order.orderNumber}</div>
                            <div className="order-date">{order.date}</div>
                          </div>
                          <div 
                            className="order-status" 
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                          </div>
                        </div>

                        <div className="order-items">
                          <div className="order-item-row">
                            <span className="order-item-name">{order.itemName} x {order.quantity}</span>
                            <span className="order-item-price">${(order.price * order.quantity).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="order-footer">
                          <div className="order-total">Total: ${(order.price * order.quantity).toFixed(2)}</div>
                          <div className="order-address">
                            <FiMapPin className="order-address-icon" />
                            {order.location}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-orders">
                    <FiPackage className="no-orders-icon" />
                    <p>No one has ordered your items yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Notification */}
        <div className={`notification ${notification.show ? 'show' : ''}`}>
          {notification.message}
        </div>
      </div>
    </>
  );
};

export default Home;
