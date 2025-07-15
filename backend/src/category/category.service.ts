import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const {name, track_id, instrument} = createCategoryDto;

    const category = this.categoryRepository.create({
      name,
      track : {id : track_id},
      instrument,
    });

    const data = await this.categoryRepository.save(category);

    if (!data) {
      throw new NotFoundException('Category creation failed');
    }
    return {success : true, message : 'Category created successfully', data};
  }

  async getMatchCategory(track_id : string){
    const data = await this.categoryRepository.find({
      where : {track : {id : track_id}},
      select : ['id', 'name'],
    });


    if (!data || data.length === 0) {
      console.log(`No matching category found for track_id: ${track_id}`);
      return { success: true, message: 'No matching elements found', data: [] };
    }
    return {success : true, message : 'match 요소 받아오기 성공', data};
  }

  async getCategoryHistory(category_id : string){
    const data = await this.categoryRepository.find({
      where : {id : category_id},
      relations : ['category_stem_file'],
    })

    if (!data || data.length === 0) {
      console.log(`No matching category found for category_id: ${category_id}`);
      return { success: true, message: 'No Histroy File', data: [] };
    }

    return {success : true, message : 'History받아오기 성공', data};
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  async getCategoryByStemId(stemId: string): Promise<Category> {
    // VersionStem을 통해 category를 조회
    const versionStem = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.version_stems', 'version_stem')
      .where('version_stem.id = :stemId', { stemId })
      .getOne();

    if (!versionStem) {
      throw new NotFoundException(`Category not found for stem ID: ${stemId}`);
    }

    return versionStem;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
