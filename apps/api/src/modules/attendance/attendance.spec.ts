import { calculateWorkUnits, calculateOtBonus, getManagementSalary } from '@snake/shared';

describe('HRM Core Calculation Engines', () => {
  describe('calculateWorkUnits (Quy đổi giờ làm sang công)', () => {
    it('Làm dưới 1h tính 0 công', () => {
      expect(calculateWorkUnits(0.5)).toBe(0);
      expect(calculateWorkUnits(0.99)).toBe(0);
    });

    it('Làm từ 1h đến dưới 2.9h tính 1/4 công (0.25)', () => {
      expect(calculateWorkUnits(1.0)).toBe(0.25);
      expect(calculateWorkUnits(2.0)).toBe(0.25);
      expect(calculateWorkUnits(2.89)).toBe(0.25);
    });

    it('Làm từ 2.9h đến dưới 4.9h tính 1/2 công (0.5)', () => {
      expect(calculateWorkUnits(2.9)).toBe(0.5);
      expect(calculateWorkUnits(3.5)).toBe(0.5);
      expect(calculateWorkUnits(4.0)).toBe(0.5); // nửa ngày làm từ 13h-17h
      expect(calculateWorkUnits(4.89)).toBe(0.5);
    });

    it('Làm từ 4.9h đến 6.5h tính 3/4 công (0.75), đúng 6.5h vẫn là 3/4', () => {
      expect(calculateWorkUnits(4.9)).toBe(0.75);
      expect(calculateWorkUnits(5.5)).toBe(0.75);
      expect(calculateWorkUnits(6.5)).toBe(0.75); // Mốc biên đã chốt
    });

    it('Làm trên 6.5h tính 1 công đầy đủ', () => {
      expect(calculateWorkUnits(6.51)).toBe(1.0);
      expect(calculateWorkUnits(7.66)).toBe(1.0); // Đi muộn 20p (vào 8h20, ra 17h = 7h40p)
      expect(calculateWorkUnits(8.0)).toBe(1.0);
    });
  });

  describe('calculateOtBonus (Thưởng làm thêm giờ theo bậc)', () => {
    it('Dưới 8h OT: không thưởng', () => {
      expect(calculateOtBonus(7.5)).toBe(0);
    });

    it('Từ 8h đến dưới 16h: thưởng 150.000đ', () => {
      expect(calculateOtBonus(8.0)).toBe(150000);
      expect(calculateOtBonus(15.99)).toBe(150000);
    });

    it('Từ 16h đến 24h: thưởng 300.000đ', () => {
      expect(calculateOtBonus(16.0)).toBe(300000);
      expect(calculateOtBonus(24.0)).toBe(300000);
    });

    it('Trên 24h: thưởng 400.000đ', () => {
      expect(calculateOtBonus(24.01)).toBe(400000);
      expect(calculateOtBonus(30.0)).toBe(400000);
    });
  });

  describe('getManagementSalary (Mức lương vị trí quản lý)', () => {
    it('Cấp 0 là 0đ', () => {
      expect(getManagementSalary(0)).toBe(0);
    });
    it('Cấp 1 là 1.000.000đ', () => {
      expect(getManagementSalary(1)).toBe(1000000);
    });
    it('Cấp 2 là 2.000.000đ', () => {
      expect(getManagementSalary(2)).toBe(2000000);
    });
    it('Cấp 3 là 3.000.000đ', () => {
      expect(getManagementSalary(3)).toBe(3000000);
    });
  });
});
