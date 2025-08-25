class DataManager {
    constructor() {
        this.rooms = [];
        this.isLoaded = false;
    }

    // Initialize - load data
    async init() {
        if (!this.isLoaded) {
            await this.loadData();
            this.isLoaded = true;
        }
        return this.rooms;
    }

    // Lưu dữ liệu vào localStorage
    saveToLocalStorage() {
        localStorage.setItem('roomsData', JSON.stringify(this.rooms));
    }

    // Import dữ liệu từ file JSON
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.rooms && Array.isArray(data.rooms)) {
                        this.rooms = data.rooms;
                        this.saveToLocalStorage();
                        resolve(this.rooms);
                    } else {
                        reject(new Error('File không đúng định dạng'));
                    }
                } catch (error) {
                    reject(new Error('Không thể đọc file JSON'));
                }
            };
            reader.onerror = () => reject(new Error('Lỗi đọc file'));
            reader.readAsText(file);
        });
    }

    // Thêm phòng mới
    addRoom(roomData) {
        roomData.id = Date.now();
        this.rooms.push(roomData);
        this.saveToLocalStorage();
        return roomData;
    }

    // Cập nhật phòng
    updateRoom(index, roomData) {
        if (index >= 0 && index < this.rooms.length) {
            roomData.id = this.rooms[index].id;
            this.rooms[index] = roomData;
            this.saveToLocalStorage();
            return roomData;
        }
        return null;
    }

    // Xóa phòng
    deleteRoom(index) {
        if (index >= 0 && index < this.rooms.length) {
            const deletedRoom = this.rooms.splice(index, 1)[0];
            this.saveToLocalStorage();
            return deletedRoom;
        }
        return null;
    }

    // Lấy tất cả phòng
    getAllRooms() {
        return this.rooms;
    }

    // Lấy phòng theo ID
    getRoomById(id) {
        return this.rooms.find(room => room.id === id);
    }

    // Kiểm tra dữ liệu có tồn tại trong localStorage
    hasLocalData() {
        const savedData = localStorage.getItem('roomsData');
        return savedData !== null && savedData !== undefined;
    }

    // Lấy thông tin về nguồn dữ liệu hiện tại
    getDataSource() {
        return this.hasLocalData() ? 'localStorage' : 'data.json';
    }

    // Clear localStorage và reload từ file JSON
    async clearLocalStorage() {
        localStorage.removeItem('roomsData');
        return await this.reloadFromFile();
    }

    // Tìm kiếm phòng
    searchRooms(query) {
        const searchTerm = query.toLowerCase();
        return this.rooms.filter(room => 
            room.title.toLowerCase().includes(searchTerm) ||
            room.address.toLowerCase().includes(searchTerm) ||
            room.description.toLowerCase().includes(searchTerm)
        );
    }

    // Lọc phòng theo giá
    filterRoomsByPrice(priceRange) {
        switch (priceRange) {
            case 'under-3':
                return this.rooms.filter(room => room.price < 3);
            case '3-5':
                return this.rooms.filter(room => room.price >= 3 && room.price <= 5);
            case '5-10':
                return this.rooms.filter(room => room.price > 5 && room.price <= 10);
            case 'over-10':
                return this.rooms.filter(room => room.price > 10);
            default:
                return this.rooms;
        }
    }

    // Load dữ liệu chính - ưu tiên localStorage, fallback về data.json
    async loadData() {
        try {
            // Kiểm tra localStorage trước
            const savedData = localStorage.getItem('roomsData');
            if (savedData) {
                const rooms = JSON.parse(savedData);
                this.rooms = Array.isArray(rooms) ? rooms : [];
                return this.rooms;
            }
            
            // Nếu không có trong localStorage, load từ file JSON
            this.rooms = await this.getDefaultData();
            
            // Lưu vào localStorage để lần sau load nhanh hơn
            this.saveToLocalStorage();
            return this.rooms;
            
        } catch (error) {
            console.error('DataManager: Lỗi khi load dữ liệu:', error);
            // Nếu có lỗi, thử load từ localStorage
            const savedData = localStorage.getItem('roomsData');
            if (savedData) {
                try {
                    this.rooms = JSON.parse(savedData);
                    return this.rooms;
                } catch (parseError) {
                    console.error('DataManager: Lỗi parse localStorage:', parseError);
                }
            }
            
            // Nếu tất cả đều thất bại, trả về mảng rỗng
            this.rooms = [];
            return this.rooms;
        }
    }

    // Force reload từ file JSON (bỏ qua localStorage)
    async reloadFromFile() {
        try {
            this.rooms = await this.getDefaultData();
            
            // Cập nhật localStorage với dữ liệu mới
            this.saveToLocalStorage();
            return this.rooms;
            
        } catch (error) {
            console.error('DataManager: Lỗi khi reload từ file:', error);
            throw error;
        }
    }

    // Reset về dữ liệu mặc định
    async resetToDefault() {
        this.rooms = await this.getDefaultData();
        this.saveToLocalStorage();
        return this.rooms;
    }

    // Load dữ liệu từ file JSON (dữ liệu gốc)
    async getDefaultData() {
        try {
            const response = await fetch("data.json");
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.rooms || [];

        } catch (error) {
            console.error("DataManager: Lỗi khi load từ data.json:", error);
            throw new Error(`Không thể load dữ liệu từ data.json: ${error.message}`);
        }
    }   


}
