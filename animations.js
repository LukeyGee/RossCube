/**
 * Retro Animation System for RossCube - Pixel Dissolve Effect
 */

/**
 * Smooth content transition with pixel dissolve and box resize
 */
function smoothTransition(fromElement, toElement, options = {}) {    const {
        contentPreparer = null,
        onComplete = null
    } = options;
    
    return new Promise((resolve) => {
        const contentBox = document.querySelector('.card');
        contentBox.classList.add('content-box');
        
        // Step 1: Capture current height
        const currentHeight = contentBox.offsetHeight;
        contentBox.style.height = `${currentHeight}px`;
        contentBox.style.transition = 'none';        // Step 2: Start pixel dissolve effect directly (no loading spinner!)
        fromElement.classList.add('pixel-dissolve');        // Start content preparation but delay border animation until glitch completes
        setTimeout(async () => {
            // Step 3: Prepare new content if needed (but keep fromElement visible and glitching)
            if (contentPreparer) {
                await contentPreparer();
            }

            // Step 4: Show new content invisibly for measurement (clean, no dissolved effects yet)
            toElement.classList.remove('hidden');
            toElement.style.opacity = '0';
            toElement.style.visibility = 'hidden';            // Delay height measurement and border animation until glitch is nearly complete
            setTimeout(() => {
                // Step 5: Measure final height (with clean, normal styling)
                // Temporarily make content visible for accurate height measurement
                toElement.style.opacity = '1';
                toElement.style.visibility = 'visible';
                
                contentBox.style.height = 'auto';
                const finalHeight = contentBox.offsetHeight;
                contentBox.style.height = `${currentHeight}px`;
                
                // Hide content again for animation
                toElement.style.opacity = '0';
                toElement.style.visibility = 'hidden';
                
                // Calculate animation duration
                const heightDifference = Math.abs(finalHeight - currentHeight);
                const baseDuration = 400;
                const extraDuration = heightDifference * 0.8;
                const totalDuration = Math.min(baseDuration + extraDuration, 1200);
                
                // Step 6: Animate height while content is hidden
                requestAnimationFrame(() => {
                    contentBox.style.transition = `height ${totalDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                    
                    requestAnimationFrame(() => {
                        contentBox.style.height = `${finalHeight}px`;
                        
                        // Step 7: After height animation, materialize new content
                        setTimeout(() => {
                            // Clear measurement styles and apply ready state using CSS class
                            toElement.style.opacity = '';
                            toElement.style.visibility = '';
                            toElement.classList.add('pixel-materialize-ready');
                            
                            requestAnimationFrame(() => {
                                toElement.classList.add('pixel-materialize');
                                
                                setTimeout(() => {
                                    toElement.classList.remove('pixel-materialize');
                                    toElement.classList.remove('pixel-materialize-ready');
                                    // Clear any remaining inline styles
                                    toElement.style.opacity = '';
                                    toElement.style.filter = '';
                                    toElement.style.transform = '';
                                    
                                    contentBox.style.height = 'auto';
                                    contentBox.style.transition = '';
                                    
                                    if (onComplete) onComplete();
                                    resolve();
                                }, 600); // Materialize duration
                            });
                        }, totalDuration + 100);
                    });
                });            }, 1000); // Wait for glitch animation to nearly complete before starting border
        }, 50); // Small delay to start content prep

        // Hide the old element ONLY after the full glitch animation completes
        setTimeout(() => {
            fromElement.classList.add('hidden');
            fromElement.classList.remove('pixel-dissolve');
        }, 1200); // Dissolve duration - made longer for more visible glitch
    });
}

/**
 * Quick transition for content changes within same step - now with pixel dissolve!
 */
function quickTransition(element, contentUpdater) {
    element.classList.add('pixel-dissolve');
    setTimeout(() => {
        contentUpdater();

        // Set the element to the starting state using CSS class
        element.classList.add('pixel-materialize-ready');
        element.classList.remove('pixel-dissolve');
        // Use requestAnimationFrame to ensure the styles are applied before starting animation
        requestAnimationFrame(() => {
            element.classList.add('pixel-materialize');
            setTimeout(() => {
                element.classList.remove('pixel-materialize');
                element.classList.remove('pixel-materialize-ready');
                // Clear any remaining inline styles
                element.style.opacity = '';
                element.style.filter = '';
                element.style.transform = '';
            }, 600); // Match the materialize animation duration
        });
    }, 1200); // Match the dissolve animation duration
}

/**
 * Button loading state helper
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = 'Loading...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Load';
    }
}
