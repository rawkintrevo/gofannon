const fs = require('fs');
const path = require('path');

// Load points config
const configPath = path.resolve(process.env.POINTS_CONFIG);
const pointsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Generate modal HTML
const htmlContent = `  
<div class="modal fade" id="scoringModal" tabindex="-1">  
  <div class="modal-dialog modal-lg">  
    <div class="modal-content bg-dark text-light">  
      <div class="modal-header border-secondary">  
        <h5 class="modal-title">🎮 Scoring System</h5>  
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>  
      </div>  
      <div class="modal-body">  
        <p>Points are awarded based on labels applied to merged pull requests:</p>  
          
        <div class="row g-3">  
          ${Object.entries(pointsConfig).map(([label, points]) => `  
            <div class="col-12 col-md-6">  
              <div class="card bg-black border-${points > 0 ? 'success' : 'danger'}">  
                <div class="card-body p-3">  
                  <div class="d-flex justify-content-between align-items-center">  
                    <span class="badge bg-${points > 0 ? 'success' : 'danger'} me-2">  
                      ${label}  
                    </span>  
                    <h5 class="mb-0 text-${points > 0 ? 'success' : 'danger'}">  
                      ${points > 0 ? '+' : ''}${points}  
                    </h5>  
                  </div>  
                </div>  
              </div>  
            </div>  
          `).join('')}  
        </div>  
  
        <div class="mt-3 text-muted">  
          <small>* Total score = sum of all label values from your merged PRs</small>  
        </div>  
      </div>  
    </div>  
  </div>  
</div>  
`;

// Write output file
fs.writeFileSync(path.resolve(process.env.OUTPUT_FILE), htmlContent.trim());  