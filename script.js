/**
 * Mental Score Predictor
 * Machine Learning Interface & API Integration
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const form = document.getElementById('mental-health-form');
    const btnSubmit = document.getElementById('btn-submit');
    const btnDismissError = document.getElementById('btn-dismiss-error');
    const themeToggle = document.getElementById('theme-toggle');
    
    const resultCard = document.getElementById('result-card');
    const errorCard = document.getElementById('error-card');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');

    const scoreValue = document.getElementById('score-value');
    const gaugeBar = document.getElementById('gauge-bar');
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const scoreDescription = document.getElementById('score-description');
    
    const factorRatio = document.getElementById('factor-ratio');
    const factorExercise = document.getElementById('factor-exercise');
    const factorStudy = document.getElementById('factor-study');
    const recommendationsList = document.getElementById('recommendations-list');

    const API_ENDPOINT = 'https://mental-score-predictionb.onrender.com/predict';

    // ==========================================
    // 1. Theme Toggle (Dark Mode Default)
    // ==========================================
    const savedTheme = localStorage.getItem('mental_score_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('mental_score_theme', newTheme);
    });

    // Reset Form Listener
    form.addEventListener('reset', () => {
        document.querySelectorAll('.input-invalid').forEach(el => el.classList.remove('input-invalid'));
        hideResult();
        hideError();
    });

    btnDismissError.addEventListener('click', hideError);

    // ==========================================
    // 2. Form Submission & ML Inference API
    // ==========================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        // Client-side HTML5 Validation
        if (!validateForm()) {
            showError('Validation Error', 'Please complete all required fields with valid parameters.');
            return;
        }

        // Construct JSON Payload mapped strictly to FastAPI Pydantic StudentData model
        const payload = {
            age: parseInt(document.getElementById('age').value, 10),
            gender: document.getElementById('gender').value,
            country: document.getElementById('country').value,
            academic_level: document.getElementById('academic_level').value,
            most_used_platform: document.getElementById('most_used_platform').value,
            purpose_of_use: document.getElementById('purpose_of_use').value,
            avg_daily_usage_hours: parseFloat(document.getElementById('avg_daily_usage_hours').value),
            daily_unlocks: parseInt(document.getElementById('daily_unlocks').value, 10),
            study_hours: parseFloat(document.getElementById('study_hours').value),
            physical_activity_hours: parseFloat(document.getElementById('physical_activity_hours').value),
            sleep_hours_per_night: parseFloat(document.getElementById('sleep_hours_per_night').value),
            stress_level: document.getElementById('stress_level').value
        };

        // Set Loading State
        setLoadingState(true);

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 422) {
                    const errData = await response.json();
                    const detailMsg = errData.detail ? JSON.stringify(errData.detail) : 'Validation failed on server.';
                    throw new Error(`422 Validation Error: ${detailMsg}`);
                } else {
                    throw new Error(`Server Error (${response.status}): ${response.statusText}`);
                }
            }

            const data = await response.json();
            
            if (data && typeof data.predicted_mental_health_score === 'number') {
                renderPredictionResult(data.predicted_mental_health_score, payload);
            } else {
                throw new Error('Invalid JSON payload structure returned by backend server.');
            }

        } catch (err) {
            console.error('Machine Learning Inference Error:', err);
            let userMsg = err.message;
            if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
                userMsg = `Unable to connect to FastAPI endpoint at ${API_ENDPOINT}. Please verify that the backend server is running via 'uvicorn main:app --reload'.`;
            }
            showError('Machine Learning Inference Failed', userMsg);
        } finally {
            setLoadingState(false);
        }
    });

    // ==========================================
    // 3. Form Validation Helper
    // ==========================================
    function validateForm() {
        let isValid = true;
        const requiredFields = form.querySelectorAll('input[required], select[required]');

        requiredFields.forEach(field => {
            if (!field.checkValidity() || field.value === '') {
                field.classList.add('input-invalid');
                isValid = false;
            } else {
                field.classList.remove('input-invalid');
            }

            field.addEventListener('input', () => {
                if (field.checkValidity() && field.value !== '') {
                    field.classList.remove('input-invalid');
                }
            }, { once: true });

            field.addEventListener('change', () => {
                if (field.checkValidity() && field.value !== '') {
                    field.classList.remove('input-invalid');
                }
            }, { once: true });
        });

        if (!isValid) {
            const firstInvalid = form.querySelector('.input-invalid');
            if (firstInvalid) {
                firstInvalid.focus();
            }
        }

        return isValid;
    }

    // ==========================================
    // 4. Result Dashboard Rendering
    // ==========================================
    function renderPredictionResult(score, inputData) {
        const formattedScore = score.toFixed(2);
        
        resultCard.classList.remove('hidden');

        // Animate counter value
        animateCounter(scoreValue, 0, parseFloat(formattedScore), 1000);

        // Update SVG Gauge Bar
        // Circumference of r=50 circle is 2 * PI * 50 = 314.16
        const maxCircumference = 314.16;
        const normalizedScore = Math.min(Math.max(score, 0), 10);
        const offset = maxCircumference - (normalizedScore / 10) * maxCircumference;
        
        setTimeout(() => {
            gaugeBar.style.strokeDashoffset = offset;
        }, 80);

        // ML Status Tiering & Color Indicators
        if (score >= 7.0) {
            gaugeBar.style.stroke = 'var(--accent-emerald)';
            statusIndicator.className = 'status-indicator indicator-optimal';
            statusText.textContent = 'Optimal Index Range';
            scoreDescription.textContent = 'The machine learning model classifies your profile within a favorable mental well-being index based on your sleep, exercise, and study balance.';
        } else if (score >= 4.5) {
            gaugeBar.style.stroke = 'var(--accent-amber)';
            statusIndicator.className = 'status-indicator indicator-moderate';
            statusText.textContent = 'Moderate Stress Risk';
            scoreDescription.textContent = 'Your metrics reflect moderate load. Minor adjustments to screen time and recovery routines can improve your overall score.';
        } else {
            gaugeBar.style.stroke = 'var(--accent-rose)';
            statusIndicator.className = 'status-indicator indicator-risk';
            statusText.textContent = 'Elevated Stress Indicator';
            scoreDescription.textContent = 'High screen usage or restricted sleep hours are contributing to an elevated stress calculation. Lifestyle adjustments recommended.';
        }

        // Factor Breakdown Metrics
        const screenSleepRatio = (inputData.avg_daily_usage_hours / (inputData.sleep_hours_per_night || 1)).toFixed(1);
        factorRatio.textContent = screenSleepRatio > 1.0 ? `${screenSleepRatio}x (Elevated)` : `${screenSleepRatio}x (Balanced)`;
        
        factorExercise.textContent = inputData.physical_activity_hours >= 1.5 ? 'Active' : 
                                      inputData.physical_activity_hours >= 0.5 ? 'Moderate' : 'Low Activity';
        
        factorStudy.textContent = inputData.study_hours > 8 ? 'Intense Load' :
                                   inputData.study_hours >= 4 ? 'Moderate Load' : 'Light Load';

        // Recommendations List
        const recs = [];
        if (inputData.sleep_hours_per_night < 7.0) {
            recs.push(`Increase nightly sleep target towards 7.5–8 hours (currently ${inputData.sleep_hours_per_night} hrs).`);
        }
        if (inputData.avg_daily_usage_hours > 4.0) {
            recs.push(`Reduce secondary screen usage on ${inputData.most_used_platform} (currently ${inputData.avg_daily_usage_hours} hrs/day).`);
        }
        if (inputData.physical_activity_hours < 1.0) {
            recs.push(`Incorporate 30+ minutes of daily physical movement or aerobic exercise.`);
        }
        if (inputData.stress_level === 'High' || inputData.stress_level === 'Very High') {
            recs.push(`Schedule structured study breaks and stress-reduction intervals during peak academic work.`);
        }
        if (recs.length === 0) {
            recs.push('Maintain your current lifestyle balance and consistent sleep schedules!');
            recs.push('Continue regular physical activity and mindful study breaks.');
        }

        recommendationsList.innerHTML = recs.map(rec => `<li>${rec}</li>`).join('');

        // Smooth scroll to result panel
        setTimeout(() => {
            resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
    }

    function animateCounter(element, start, end, duration) {
        let startTime = null;
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentVal = start + progress * (end - start);
            element.textContent = currentVal.toFixed(2);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        }
        window.requestAnimationFrame(step);
    }

    // ==========================================
    // 5. Error & Loading State Handlers
    // ==========================================
    function setLoadingState(isLoading) {
        if (isLoading) {
            btnSubmit.classList.add('btn-loading');
            btnSubmit.disabled = true;
        } else {
            btnSubmit.classList.remove('btn-loading');
            btnSubmit.disabled = false;
        }
    }

    function showError(title, message) {
        errorTitle.textContent = title;
        errorMessage.textContent = message;
        errorCard.classList.remove('hidden');
        errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideError() {
        errorCard.classList.add('hidden');
    }

    function hideResult() {
        resultCard.classList.add('hidden');
    }
});
