import { NotFoundException } from '@nestjs/common';
import { PastesController } from './pastes.controller';
import type { Paste } from './paste.entity';

describe('PastesController', () => {
  const create = jest.fn();
  const findOne = jest.fn();
  const controller = new PastesController({ create, findOne } as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates creation and returns the saved paste', async () => {
    const paste = { id: 'id', content: 'hello' } as Paste;
    create.mockResolvedValue(paste);
    const dto = { content: 'hello' };
    await expect(controller.create(dto)).resolves.toBe(paste);
    expect(create).toHaveBeenCalledWith(dto);
  });

  it('returns the paste found by id', async () => {
    const paste = { id: 'id', content: 'hello' } as Paste;
    findOne.mockResolvedValue(paste);
    await expect(controller.findOne('id')).resolves.toBe(paste);
    expect(findOne).toHaveBeenCalledWith('id');
  });

  it('propagates NotFoundException from the service', async () => {
    findOne.mockRejectedValue(new NotFoundException('Paste not found'));
    await expect(controller.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
