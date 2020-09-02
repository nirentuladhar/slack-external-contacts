import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm'
import { Contact } from './Contact'
import { Organisation } from './Organisation'

@Entity()
export class Grant {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne((type) => Organisation, (organisation) => organisation.grants)
  organisation: Organisation

  @ManyToOne((type) => Contact, (contact) => contact.grants)
  contact: Contact

  @Column({ nullable: true })
  proposal: string

  @Column({ nullable: true })
  project_code: string

  @Column({ nullable: true })
  amount: number

  @Column({ nullable: true })
  ccy: string

  @Column({ nullable: true })
  status: string

  @Column({ nullable: true, type: 'timestamp with time zone' })
  startedAt: Date

  @Column({ nullable: true })
  notes: string

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date
}
