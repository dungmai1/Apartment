class RoomManager {
    constructor() {
        this.dataManager = new DataManager();
        this.rooms = [];
        this.editingIndex = -1;
        this.currentGalleryRoom = null;
        this.currentImageIndex = 0;
        this.initializeApp();
    }

    // Helper function để chuẩn hóa chuỗi (bỏ dấu, chuyển thường)
    normalizeString(str) {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'd')
            .trim();
    }

    // Kiểm tra địa chỉ có khớp với khu vực không
    matchesArea(address, areaCode) {
        const normalizedAddress = this.normalizeString(address);
        
        // Định nghĩa các từ khóa cho mỗi khu vực
        const areaKeywords = {
            'binh-thanh': ['binh thanh'],
            'go-vap': ['go vap'],
            'tan-binh': ['tan binh'],
            'phu-nhuan': ['phu nhuan']
        };
        
        const keywords = areaKeywords[areaCode];
        if (!keywords) return false;
        
        // Kiểm tra xem địa chỉ có chứa từ khóa nào không
        return keywords.some(keyword => {
            const normalizedKeyword = this.normalizeString(keyword);
            return normalizedAddress.includes(normalizedKeyword);
        });
    }

    async initializeApp() {
        await this.loadRooms();
        this.initializeEventListeners();
        this.renderRooms();
    }

    async loadRooms() {
        // Xóa localStorage để force load từ file JSON
        localStorage.removeItem('roomsData');
        
        try {
            // Load dữ liệu từ file JSON
            this.rooms = await this.dataManager.loadData();
            
        } catch (error) {
            console.error('RoomManager: Lỗi khi load phòng:', error);
            this.rooms = []; // Nếu lỗi thì để mảng rỗng
        }
    }

    initializeEventListeners() {
        // Filters
        const priceFilter = document.getElementById('priceFilter');
        const areaFilter = document.getElementById('areaFilter');
        
        if (priceFilter) {
            priceFilter.addEventListener('change', () => this.renderRooms());
        }
        
        if (areaFilter) {
            areaFilter.addEventListener('change', () => this.renderRooms());
        }

        // Gallery modal controls
        this.initializeGalleryEvents();
    }

    initializeGalleryEvents() {
        const galleryModal = document.getElementById('galleryModal');
        const galleryClose = document.querySelector('.gallery-close');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const galleryUpload = document.getElementById('galleryUpload');
        const uploadArea = document.querySelector('.upload-area');

        // Close gallery
        galleryClose.addEventListener('click', () => this.closeGallery());
        galleryModal.addEventListener('click', (e) => {
            if (e.target === galleryModal) this.closeGallery();
        });

        // Navigation
        prevBtn.addEventListener('click', () => this.previousImage());
        nextBtn.addEventListener('click', () => this.nextImage());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (galleryModal.style.display === 'block') {
                if (e.key === 'Escape') this.closeGallery();
                if (e.key === 'ArrowLeft') this.previousImage();
                if (e.key === 'ArrowRight') this.nextImage();
            }
        });

        // File upload (chỉ khi element tồn tại)
        if (galleryUpload) {
            galleryUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Drag and drop (chỉ khi element tồn tại)
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                this.processImageFiles(files);
            });
        }
    }

    getFilteredRooms() {
        const priceFilter = document.getElementById('priceFilter')?.value;
        const areaFilter = document.getElementById('areaFilter')?.value;
        
        return this.rooms.filter(room => {
            let matchesPrice = true;
            let matchesArea = true;
            
            // Filter theo giá
            if (priceFilter) {
                switch (priceFilter) {
                    case 'under-3':
                        matchesPrice = room.price < 3;
                        break;
                    case '3-5':
                        matchesPrice = room.price >= 3 && room.price <= 5;
                        break;
                    case '5-10':
                        matchesPrice = room.price > 5 && room.price <= 10;
                        break;
                    case 'over-10':
                        matchesPrice = room.price > 10;
                        break;
                }
            }
            
            // Filter theo khu vực
            if (areaFilter) {
                matchesArea = this.matchesArea(room.address, areaFilter);
            }
            
            return matchesPrice && matchesArea;
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    // Gallery functions
    openGallery(roomIndex) {
        this.currentGalleryRoom = this.rooms[roomIndex];
        this.currentImageIndex = 0;
        
        const modal = document.getElementById('galleryModal');
        const title = document.querySelector('.gallery-title');
        
        title.textContent = `Hình ảnh - ${this.currentGalleryRoom.title}`;
        
        this.renderGalleryImages();
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeGallery() {
        const modal = document.getElementById('galleryModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentGalleryRoom = null;
    }

    renderGalleryImages() {
        if (!this.currentGalleryRoom) return;

        const images = this.currentGalleryRoom.images || [];
        const mainImage = document.getElementById('mainImage');
        const noMainImage = document.getElementById('noMainImage');
        const thumbnailGrid = document.getElementById('thumbnailGrid');
        const imageCounter = document.getElementById('imageCounter');
        const currentIndex = document.getElementById('currentIndex');
        const totalImages = document.getElementById('totalImages');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (images.length === 0) {
            mainImage.style.display = 'none';
            noMainImage.style.display = 'flex';
            imageCounter.style.display = 'none';
            thumbnailGrid.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">Chưa có hình ảnh nào</p>';
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            return;
        }

        // Show main image
        mainImage.src = images[this.currentImageIndex];
        mainImage.style.display = 'block';
        noMainImage.style.display = 'none';

        // Update counter
        currentIndex.textContent = this.currentImageIndex + 1;
        totalImages.textContent = images.length;
        imageCounter.style.display = 'block';

        // Navigation buttons
        prevBtn.style.display = images.length > 1 ? 'flex' : 'none';
        nextBtn.style.display = images.length > 1 ? 'flex' : 'none';
        prevBtn.disabled = this.currentImageIndex === 0;
        nextBtn.disabled = this.currentImageIndex === images.length - 1;

        // Render thumbnails
        thumbnailGrid.innerHTML = images.map((image, index) => `
            <img src="${image}" 
                 class="thumbnail ${index === this.currentImageIndex ? 'active' : ''}" 
                 onclick="roomManager.showImage(${index})"
                 alt="Thumbnail ${index + 1}">
        `).join('');
    }

    showImage(index) {
        this.currentImageIndex = index;
        this.renderGalleryImages();
    }

    previousImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            this.renderGalleryImages();
        }
    }

    nextImage() {
        if (this.currentGalleryRoom && this.currentImageIndex < this.currentGalleryRoom.images.length - 1) {
            this.currentImageIndex++;
            this.renderGalleryImages();
        }
    }

    handleImageUpload(event) {
        const files = event.target.files;
        this.processImageFiles(files);
        event.target.value = ''; // Reset input
    }

    async processImageFiles(files) {
        if (!this.currentGalleryRoom) return;

        const roomIndex = this.rooms.findIndex(room => room.id === this.currentGalleryRoom.id);
        if (roomIndex === -1) return;

        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const imageData = await this.fileToBase64(file);
                
                if (!this.rooms[roomIndex].images) {
                    this.rooms[roomIndex].images = [];
                }
                
                this.rooms[roomIndex].images.push(imageData);
            }
        }

        // Update current gallery room reference
        this.currentGalleryRoom = this.rooms[roomIndex];
        
        // Save to storage
        this.dataManager.rooms = this.rooms;
        this.dataManager.saveToLocalStorage();
        
        // Refresh gallery
        this.renderGalleryImages();
        this.renderRooms(); // Update main view
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    renderRooms() {
        const roomList = document.getElementById('roomList');
        const filteredRooms = this.getFilteredRooms();
        
        if (filteredRooms.length === 0) {
            roomList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-home"></i>
                    <h3>Không có phòng nào</h3>
                    <p>Hãy thêm phòng mới để bắt đầu quản lý</p>
                </div>
            `;
            return;
        }
        
        roomList.innerHTML = filteredRooms.map((room, index) => {
            const roomIndex = this.rooms.indexOf(room);
            const firstImage = room.images && room.images.length > 0 ? room.images[0] : null;
            const imageCount = room.images ? room.images.length : 0;
            return `
            <div class="room-card">
                <div class="room-image" onclick="roomManager.openGallery(${roomIndex})" title="Click để xem tất cả hình ảnh">
                    ${firstImage ? 
                        `<img src="${firstImage}" alt="${room.title}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;">
                         ${imageCount > 1 ? `<div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; z-index: 2;">
                            <i class="fas fa-images"></i> ${imageCount}
                         </div>` : ''}` : 
                        '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #95a5a6;"><i class="fas fa-image" style="font-size: 2em; margin-bottom: 10px;"></i><span>Chưa có hình ảnh</span></div>'
                    }
                </div>
                <div class="room-content">
                    <h3 class="room-title">${room.title}</h3>
                    <div class="room-price">${room.price} triệu/tháng</div>
                    <div class="room-address">
                        <i class="fas fa-map-marker-alt"></i>
                        ${room.address}
                    </div>
                    
                    <div class="room-utilities">
                        <div class="utility-item">
                            <span class="utility-label">Điện:</span>
                            <span class="utility-value">${this.formatCurrency(room.electricPrice)}/kWh</span>
                        </div>
                        <div class="utility-item">
                            <span class="utility-label">Nước:</span>
                            <span class="utility-value">${this.formatCurrency(room.waterPrice)}/m³</span>
                        </div>
                        <div class="utility-item">
                            <span class="utility-label">Dịch vụ:</span>
                            <span class="utility-value">${this.formatCurrency(room.servicePrice)}/tháng</span>
                        </div>
                        <div class="utility-item">
                            <span class="utility-label">Giữ xe:</span>
                            <span class="utility-value">${this.formatCurrency(room.parkingPrice)}/tháng</span>
                        </div>
                    </div>
                    
                    ${room.description ? `<p style="font-size: 14px; color: #666; margin-bottom: 15px;">${room.description}</p>` : ''}
                </div>
            </div>
        `}).join('');
    }
}

// Khởi tạo ứng dụng
const roomManager = new RoomManager();
