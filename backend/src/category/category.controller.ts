import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: '카테고리 생성', description: '새로운 카테고리를 생성합니다.' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: '카테고리 생성 성공' })
  @ApiResponse({ status: 400, description: '입력값 유효성 검사 실패' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Get('match/:id')
  @ApiOperation({ summary: '트랙 매칭 카테고리 조회', description: '특정 트랙과 매칭되는 카테고리를 조회합니다.' })
  @ApiParam({ name: 'id', description: '트랙 ID' })
  @ApiResponse({ status: 200, description: '매칭 카테고리 조회 성공' })
  @ApiResponse({ status: 404, description: '트랙을 찾을 수 없음' })
  getMatchCategory(@Param('id') track_id: string){
    return this.categoryService.getMatchCategory(track_id);
  }

  @Get(':id')
  @ApiOperation({ summary: '카테고리 히스토리 조회', description: '특정 카테고리의 히스토리를 조회합니다.' })
  @ApiParam({ name: 'id', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '카테고리 히스토리 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  findOne(@Param('id') category_id : string) {
    return this.categoryService.getCategoryHistory(category_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '카테고리 수정', description: '카테고리 정보를 수정합니다.' })
  @ApiParam({ name: 'id', description: '카테고리 ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: '카테고리 수정 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '카테고리 삭제', description: '카테고리를 삭제합니다.' })
  @ApiParam({ name: 'id', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '카테고리 삭제 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }
}
